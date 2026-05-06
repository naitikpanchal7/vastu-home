import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function processQueue() {
  // Fetch all entries whose grace period has expired
  const { data: entries, error } = await supabase
    .from("storage_cleanup_queue")
    .select("id, bucket, path")
    .lte("delete_after", new Date().toISOString());

  if (error) {
    console.error("[purge-storage] queue fetch failed:", error.message);
    return;
  }
  if (!entries?.length) return;

  // Group entries by bucket, keeping the id alongside so we can track which
  // ones actually succeeded and only remove those from the queue.
  const byBucket = entries.reduce<Record<string, { id: string; path: string }[]>>((acc, entry) => {
    (acc[entry.bucket] ??= []).push({ id: entry.id, path: entry.path });
    return acc;
  }, {});

  const succeededIds: string[] = [];

  for (const [bucket, items] of Object.entries(byBucket)) {
    const paths = items.map((i) => i.path);
    const { error: removeErr } = await supabase.storage.from(bucket).remove(paths);
    if (removeErr) {
      // Leave these queue entries in place so the next run retries them.
      console.error(`[purge-storage] storage.remove failed for ${bucket}:`, removeErr.message);
    } else {
      succeededIds.push(...items.map((i) => i.id));
    }
  }

  // Only cross off entries where the file was actually deleted.
  if (succeededIds.length > 0) {
    await supabase.from("storage_cleanup_queue").delete().in("id", succeededIds);
  }

  console.log(`[purge-storage] cleaned ${succeededIds.length}/${entries.length} file(s) across ${Object.keys(byBucket).length} bucket(s)`);
}

// Runs nightly at 3:30am — 30 minutes after the DB hard-delete cron at 3:00am
Deno.cron("purge-storage", "30 3 * * *", processQueue);

// HTTP handler so you can trigger it manually for testing
Deno.serve(async () => {
  await processQueue();
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});
