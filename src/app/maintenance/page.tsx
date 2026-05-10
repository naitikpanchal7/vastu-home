export default async function MaintenancePage() {
  // Fetch the custom maintenance message
  let message = "The platform is under scheduled maintenance. We will be back shortly.";
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("admin_settings")
      .select("value")
      .eq("key", "maintenance_message")
      .single();
    if (typeof data?.value === "string") message = data.value;
  } catch { /* use default */ }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-[480px] text-center">
        <div className="w-[56px] h-[56px] bg-gradient-to-br from-gold-3 to-saffron rounded-[14px] flex items-center justify-center font-serif text-[28px] font-semibold text-[#faf7f0] mx-auto mb-6">
          V
        </div>
        <h1 className="font-serif text-[28px] font-semibold text-gold-2 mb-3">
          Under Maintenance
        </h1>
        <p className="text-[13px] text-vastu-text-2 leading-relaxed mb-6">{message}</p>
        <div className="text-[10px] text-vastu-text-3 tracking-[2px] uppercase">vastu@home</div>
      </div>
    </div>
  );
}
