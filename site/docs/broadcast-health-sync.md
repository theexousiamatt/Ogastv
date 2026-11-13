# Broadcast health synchronization — operational setup

This feature **is not active until both required secrets and a scheduler are configured**.

## Server configuration

- `YOUTUBE_API_KEY`: restricted server-side API key with YouTube Data API v3 enabled. Never expose with `NEXT_PUBLIC_`.
- `OGASTV_BROADCAST_SYNC_TOKEN`: random 32+ byte token used only for cron authentication.

Existing `CLOUDFLARE_REALTIME_APP_ID` and `CLOUDFLARE_REALTIME_API_TOKEN` remain unchanged.

Hostinger's Node.js variable operation **replaces the entire variable set**. Do not update it using values returned as masked `********` from the read API: doing so would destroy existing production secrets. Add new keys in Hostinger hPanel or via a full set of real values.

## Scheduler

Schedule an authenticated `POST https://ogastvafrica.ng/api/ogas-live/sync` once per minute, using `Authorization: Bearer <OGASTV_BROADCAST_SYNC_TOKEN>`. Store the secret outside source control, process command logs, screenshots, and public files. Do not put a literal token into a cron command visible in the hosting dashboard.

Schedule runs independently of visits; browser polling remains read-only. A 90-second grace period starts on the first detected Cloudflare SFU track outage. Because checks are every minute, ending can take longer than 90 seconds. YouTube `actualEndTime` is authoritative; missing/failed API responses do not end a stream.

## Before production

1. Run Node 24 typecheck/build and validate the hosting environment is configured.
2. Simulate YouTube states: `upcoming`, `live`, `actualEndTime`, unavailable/private, 403, quota exhaustion, timeout.
3. Simulate Cloudflare publisher tracks: active, inactive, absent, disconnect/recover, and API unavailable.
4. Verify no false LIVE status is shown on a verified inactive stream, automatic ended state appears for existing viewers, and the completed YouTube video appears exactly once under `/watch`.
5. Confirm Cloudflare track activity against real mobile browser media transmission. Active tracks alone do **not** prove incoming RTP packets; broadcaster-side `getStats()` telemetry should be a further enhancement.

Avoid routing this feature directly into production without the required variables, schedule, and tests.
