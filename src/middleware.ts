import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/projects", "/canvas", "/reports", "/settings", "/admin"];
const AUTH_PAGES = ["/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on protected and auth routes
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuth      = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isAdmin     = pathname.startsWith("/admin");
  const isMaintenance = pathname.startsWith("/maintenance");
  const isSuspended   = pathname.startsWith("/suspended");
  const isApi         = pathname.startsWith("/api");

  if (!isProtected && !isAuth) return NextResponse.next();
  if (isMaintenance || isSuspended || isApi) return NextResponse.next();

  // Build Supabase SSR client — setAll writes refreshed tokens back to the response
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // getUser() validates the JWT server-side and refreshes if needed.
  // When the refresh token is stale/invalid it returns null without throwing.
  let user = null;
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;
  } catch { /* network issue — treat as unauthenticated */ }

  // Unauthenticated → redirect to login (skip for auth pages)
  if (!user && isProtected) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated on login page → redirect to dashboard
  if (user && isAuth) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user) return supabaseResponse;

  // ── Check maintenance mode (skip for admins) ──────────────────────────────
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Service role key missing — skip maintenance/suspension checks rather than crashing
    return supabaseResponse;
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );

  let maintenanceSetting: { value?: unknown } | null = null;
  let profile: { is_admin?: boolean; suspended_at?: string | null } | null = null;
  try {
    const [ms, pr] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any).from("admin_settings").select("value").eq("key", "maintenance_mode").single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any).from("profiles").select("is_admin, suspended_at").eq("id", user.id).single(),
    ]);
    maintenanceSetting = ms.data;
    profile = pr.data;
  } catch { /* DB unreachable — skip checks */ }

  const maintenanceOn = maintenanceSetting?.value === true || maintenanceSetting?.value === "true";
  const isAdminUser   = profile?.is_admin === true;
  const isSuspendedUser = !!profile?.suspended_at;

  // Suspended users → /suspended (except admins)
  if (isSuspendedUser && !isAdminUser && !isSuspended) {
    return NextResponse.redirect(new URL("/suspended", request.url));
  }

  // Maintenance mode → /maintenance (except admins)
  if (maintenanceOn && !isAdminUser && !isMaintenance) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  // Admin routes → only admins
  if (isAdmin && !isAdminUser) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
