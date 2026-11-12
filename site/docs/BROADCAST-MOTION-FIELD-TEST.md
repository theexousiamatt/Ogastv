# OgasTV — live-stream motion quality field test

This checklist is for **real phone testing**, not a simulated claim of a field pass.
The sender is the existing Cloudflare Realtime WebRTC broadcaster.
No livestream production release should be approved on synthetic statistics alone.

## Before testing

- Use the same phone, camera lens, lighting, location, subject and composition for both network runs.
- Use two devices: one publishes in the OgasTV Broadcast Studio, the other watches the public live page.
- Use a consented, non-sensitive test scene: broadcasts become public when **Go live** is pressed.
- Ensure the phone camera lens is clean, battery-saving mode is off, and lighting is adequate.
- Avoid a captive Wi-Fi network or VPN that interferes with WebRTC/UDP traffic.
- Check phone operating-system network permissions and HTTPS camera/microphone permissions.
- For the mobile run, turn **off Wi-Fi** and confirm that cellular data is genuinely carrying the broadcaster's upload.
- For the Wi-Fi run, keep mobile data off if possible to avoid silent fallback.

## Run the same scenes on each network

| Step | Duration | What broadcaster does | What the viewer checks |
|---|---|---|---|
| Static | 30 seconds | Hold a still, well-lit object with fine text in the frame | Sharpness, blockiness and text legibility |
| Slow pan | 30 seconds | Move camera steadily left/right across detailed objects | Smearing, compression blocks, motion smoothness |
| Walking | 30 seconds | Walk at a normal pace while holding the phone | Loss of detail, stutters, recovery |
| Controlled shake | 15 seconds | Make brief, realistic small movements | Whether the stream blurs and whether it recovers promptly |
| Recovery | 30 seconds | Hold phone steady again | Time until video returns to normal |

Repeat the sequence for **Wi-Fi** and **mobile data**, keeping everything else as similar as practical. Repeat after moving to an adequately lit area if only the darker scene exhibits blur.

## Record for each run

- Device and browser/OS version.
- Network: Wi-Fi / mobile data; mobile carrier if relevant.
- Capture settings displayed below the camera.
- From the live **Stream health** panel, copy diagnostics near the beginning, during motion, and after the recovery.
- Have the viewer record a brief screen capture and note when picture quality degrades.
- Watch for packet loss (if reported), unusual RTT, less than 24 encoded FPS, and bandwidth / cpu limitation reasons. These are **investigation signals**, not guaranteed pass/fail thresholds.
- Compare publisher preview to viewer output. If both blur similarly, test autofocus, lens stabilization and lighting; if only viewer output blurs, focus on encoding and transmission.

## Acceptance

1. Both networks can start/stop and maintain a watchable stream.
2. A short pan or natural hand movement does not cause sustained macroblocking.
3. The stream recovers visually after movement without needing to restart.
4. The Stream health panel continues updating during the broadcast, including periods when optional metrics are unavailable.
5. Camera, microphone and event publication continue working as before.
6. Any failing scene has an accompanying diagnostic snapshot and viewer recording before further bitrate or layer changes are attempted.

## Interpret the diagnostic values

- **Sent video Mbps** is actual encoded upstream video traffic, **not upload speed**. Static scenes may send much less.
- **Encoded FPS** can fall because of bandwidth pressure or phone CPU/thermal pressure.
- **Packet loss and RTT** may be unavailable on some WebRTC implementations. An em dash means *not reported*, not zero.
- **Encoder limitation** may indicate bandwidth or cpu, when supported by the browser.
- A sharp local preview with a blurry watcher suggests compression/transmission trouble; a blurry local preview suggests camera focus, exposure or motion-stabilization trouble.

## Release notes

The initial change offers **HD 720p at up to 3.5 Mbps** (default for mobile data), and optional **Full HD 1080p at up to 5 Mbps** for a capable phone on strong Wi-Fi. Both target 30 FPS. These are encoder *maximums*, never minimum upload rates; browser congestion control continues adapting. Capture settings displayed by the app are the actual negotiated camera resolution, which can be lower than requested. If mobile data quality is poor, switch back to HD for the next broadcast. If field tests still show quality collapse under normal movement, assess connection capacity, phone encoder performance, and then (in a separate change) whether Cloudflare SFU simulcast publishing / viewer layer selection is warranted.

Do not log stream identifiers, access tokens, recordings, or other sensitive personal content as part of diagnostics.
