# OgasTV local writing desk

This is a static, local working preview. It has no CMS connection, server accounts, cross-device sync or online publication. Writer and Editor are preview modes, not authorization boundaries.

## Run

From this folder, run `python3 -m http.server 4182 --bind 127.0.0.1`, then open `http://127.0.0.1:4182/dist/`. Keep the process running while using the preview. No build step or package installation is required.

## Mobile comes first

Design and verify the complete writer workflow at 320px, 390px and 430px before adapting to desktop. Keep the story in one column, primary actions within thumb reach, inputs at least 16px, and touch targets at least 44px where practical. Headline text wraps and expands. Common formatting stays visible; additional tools have a labelled disclosure rather than hidden horizontal scrolling. Audio and Dictate remain separate actions. Phone entry defaults to the phone article preview. Dialogs use the visual viewport height, remain scrollable, and keep their actions accessible when space becomes short. Preserve safe-area spacing and visible keyboard focus. Verify real iOS/Android keyboard behavior on devices before a public release; a short desktop viewport is not an equivalent test.

## Writer workflow

- Start with the headline and reporting; text and media autosave in IndexedDB on this browser.
- Paste reporting, retain safe emphasis/links/lists, add prepared images, edit captions, credit and alternative text, and preview the full article at desktop or phone width.
- Audio is a playable story attachment: record, upload a file, or use a direct HTTPS audio URL. Listen before insertion and optionally provide a checked transcript. Spotify/SoundCloud page URLs and arbitrary embed HTML are not supported.
- Dictate is separate speech-to-text. It inserts editable words at the writing cursor and does not create an audio attachment. Recognition availability, language support, accuracy and network processing depend on the browser's speech service.
- Submit to the local review queue; switch the preview role to Editor to request changes or approve locally. Editing a reviewed/approved story reopens it as a draft. Approval requires photography and alternative text.
- Download a story backup, including local media, and restore it as a new draft. Linked audio remains a link. Browser storage is not a cloud backup and can be removed by browser/site-data cleanup.

## Implementation

`dist/index.html` contains the semantic interface and SVG icon sprite. `dist/assets/` contains small native ES modules: `model.js` (sanitization and workflow), `storage.js` (revision-aware IndexedDB), `media.js` (images, media rendering, article preview), `voice.js` (recording and speech controllers), `audio-tools.js`, `dictation-tools.js`, and `editor.js` (UI integration). `editor.css` preserves the charcoal/red OgasTV identity and provides responsive/editor/dialog states.

Image uploads: JPG/PNG/WebP, up to 25 MB and 50 megapixels, resized to a maximum 2000px edge. Audio uploads: up to 40 MB; recording stops at 15 minutes or the size limit. Stories have an 80 MB local media budget. Playback depends on native codec support. Recording requires HTTPS or localhost plus microphone permission. LAN HTTP can use the editor and upload/link tools but cannot record.

## Verify

Open `/tests/checks.html` and select **Run checks**. The suite uses isolated test databases and synthetic audio, without microphone access. It checks storage, stale-write conflicts, media persistence, workflow validation, sanitization, cropping, speech-result deduplication, recording lifecycle and playback.

`/tests/feature-fixture.html?workspace=test-name` supplies clearly labelled synthetic microphone and speech inputs. `mode=denied`, `mode=unsupported` and `mode=storage-error` exercise failure states. These are test-only pages outside `dist/`.

`/tests/audit.html?w=390&h=844` embeds the real interface at a chosen viewport and runs the bundled test-only axe audit. Also check 320×568 and 1280×900, keyboard focus, scroll reachability, modal close/focus return, and the complete draft → feedback → revision → approval workflow.

Automated speech events do not verify native speech recognition. A real microphone, mobile virtual keyboard, physical touch behavior, Safari/Firefox codec support and browser speech services still need device testing.

## Deployment

The requested production workflow is GitHub (`theexousiamatt/Ogastv`, branch `main`) → Hostinger. This is buildless HTML and JavaScript: deploy `dist/` as the web root. The root `index.html` redirects to `/dist/` for hosts that serve the repository root. Keep test harnesses and backups outside the public web root when configuring hosting. The retained `.openai/hosting.json` identifies the original Sites project; publishing through Sites is a separate workflow. Hosting the editor does not add a CMS, authentication or shared story storage.
