// Next.js instrumentation hook — runs once when the server process boots.
// Wires the automated news pipeline WITHOUT any external scheduler dependency
// (node-cron pulls Node built-ins that break the webpack/edge bundle). A plain
// setInterval is more than enough for a 6-hour cadence.
//
//   • runs a GNews sync every SYNC_INTERVAL_HOURS (default 6h)
//   • re-scores trending hourly so freshness decay keeps the feed lively
//   • optionally runs one sync on boot if the DB is empty (SYNC_ON_BOOT)

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Avoid double-scheduling across HMR reloads / multiple workers in dev.
  const g = globalThis as unknown as { __orbitNewsScheduler?: boolean };
  if (g.__orbitNewsScheduler) return;
  g.__orbitNewsScheduler = true;

  const { syncAll, isDbEmpty, recomputeTrending } = await import("@/lib/sync");
  const { hasApiKey } = await import("@/lib/gnews");

  const HOUR = 60 * 60 * 1000;
  const syncHours = Number(process.env.SYNC_INTERVAL_HOURS || 6);

  if (!hasApiKey()) {
    console.warn(
      "[BRIEFXIFY] GNEWS_API_KEY not set — automated sync disabled. Add it to .env."
    );
  } else {
    // Full sync every N hours.
    setInterval(async () => {
      console.log("[BRIEFXIFY] scheduled sync starting…");
      try {
        const r = await syncAll();
        console.log(
          `[BRIEFXIFY] sync done: +${r.totals.inserted} new, ${r.totals.duplicates} dupes, ${r.scored} scored`
        );
      } catch (e) {
        console.error("[BRIEFXIFY] scheduled sync failed:", e);
      }
    }, Math.max(1, syncHours) * HOUR).unref?.();

    console.log(`[BRIEFXIFY] news sync scheduled every ${syncHours}h`);

    // Re-score trending hourly between full syncs.
    setInterval(async () => {
      try {
        await recomputeTrending();
      } catch {
        /* noop */
      }
    }, HOUR).unref?.();

    if (process.env.SYNC_ON_BOOT === "true") {
      try {
        if (await isDbEmpty()) {
          console.log("[BRIEFXIFY] DB empty — running initial sync on boot…");
          syncAll()
            .then((r) =>
              console.log(`[BRIEFXIFY] boot sync: +${r.totals.inserted} articles`)
            )
            .catch((e) => console.error("[BRIEFXIFY] boot sync failed:", e));
        }
      } catch (e) {
        console.error("[BRIEFXIFY] boot sync check failed:", e);
      }
    }
  }
}
