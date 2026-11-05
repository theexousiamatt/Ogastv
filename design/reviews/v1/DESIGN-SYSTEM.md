# OgasTV Africa — Design System & Experience Concepts v1
**Status:** High-fidelity design exploration for review, not approved for implementation  
**Owner:** Inspirare Studio  
**Date:** 5 November 2026  
**Primary review:** Open `OgasTV_Africa_Design_Review_v1.html` in a browser. It contains six navigable concepts and desktop / 390px-mobile preview modes.

## 1. Core visual proposition
**Newsprint editorial + contemporary digital broadcast.** The publication should feel confident and trustworthy, with carefully considered typesetting and photography-led storytelling. The Studio uses a dark broadcast palette as an extension of the same system. The staff newsroom is a restrained editorial workspace rather than a box-heavy SaaS template.

Avoid generic cards for every section, excessive radii, gratuitous gradients, bloated hero copy, random decorative illustrations, fake reporting photography, simulated live data presented as real, and icon-style inconsistency.

## 2. Foundations

### Color tokens
| Role | Token | Hex | Application |
| --- | --- | --- | --- |
| Primary text | editorial-ink | `#171B1A` | Headers, primary buttons, body text |
| Primary page | newsprint | `#F7F6F2` | Public-facing background |
| Clean surface | pure-white | `#FFFFFF` | Header, forms, editorial workspace |
| Secondary surface | warm-ivory | `#F0EEE7` | Related stories, reading modules |
| Dividers | stroke-light | `#D9DBD4` | Section rules, fine borders |
| Primary accent | signal-red | `#B9232E` | Live signals, key editorial links, selected cues |
| Secondary accent | community-green | `#285D50` | Lagos Watch, place discovery, selected filters |
| Broadcast base | studio-night | `#101921` | Player, live hub and video stage |
| Broadcast panels | studio-panel | `#202D33` | Broadcast rails and timeline cards |
| Secondary body | text-muted | `#707571` | Metadata, captions, supporting copy |

Color usage: roughly 75–85% neutrals, 10–18% editorial ink/dark, 2–6% expressive accent. Red should have meaning rather than being used on every card. Ensure AA contrast against the selected background before implementation.

### Typography
- **Newsreader** — display, section headings, article headings, deck, pull quote, long-form article body. Editorial headlines intentionally use controlled negative letter spacing and compact line height.
- **DM Sans** — all interface/navigation, article metadata, button labels, forms, author details and tables.
- Proposed desktop type scale (px): 10, 11, 12, 14, 16, 19, 22, 28, 36, 48, 64, 80.
- Proposed mobile display scale: 36, 42, 48. Body reading: 19–21px / 1.58 line height. Full-page reading column max 680–740px.
- Underline descriptive links in body copy; do not rely solely on color to convey clickability.

### Geometry & responsive rules
- Spacing scale: `4 / 8 / 12 / 20 / 32 / 48 / 72 / 96px`.
- Radius: 0–6px for editorial surfaces; fully rounded only for semantic filter pills.
- Desktop: 12-column grid with 48px outer margin at 1440px, flexible editorial hierarchy; reading column max 740px.
- Mobile: 390px concept width; 16–20px side margins; 4-column grid; preserve asymmetric hierarchy through type/image proportions rather than cramped columns.
- No fixed-height article text containers. Never clip article headlines. Respect user text zoom and reduced motion.

## 3. Iconography and illustration
- Base icon grid 24×24px with ~1.75–2px stroke, square line caps and deliberate corner geometry; use a consistent Lucide-derived family or bespoke vectors when the icon is editorially significant. Avoid mixing filled emoji icons and inconsistent 3D iconography.
- Essential icon set: search, bookmark, location, share, media play, signal/live, calendar, filter, accessibility, volume, caption, fullscreen, warning, upload, edit, article, settings, save, back, chevron, info, arrows.
- Custom illustration direction: civic maps, line-drawn places, annotated data diagrams, documentary-inspired collage and original typography. These must be clearly labeled *illustration* rather than presented as evidence.
- Photography direction: human-centered documentary photographs, meaningful captions, author credit, descriptive alt text, consistent cropping and no AI-manufactured journalistic scenes.

## 4. Component inventory (v1 to build in Figma once tool access is restored)
1. Masthead / Desktop, Compact, Mobile; navigation active and overflow states.
2. Buttons / Primary, Secondary, Text; Default, Hover, Focus, Loading, Disabled.
3. Icon button / Save, Search, Share, Back; Default, Active, Hover, Focus, Disabled.
4. Editorial story / Lead, Compact, Feature, Portrait, Video, Live; with media fallback and no-image variants.
5. Article category / Text and location categories; selectable, active and unavailable states.
6. Story metadata / author, timestamp, location, reading time, video duration and corrections.
7. Form field / Default, Focus, Error, Valid, Disabled, Password visible/hidden, Helper text.
8. Alert / Editorial info, Success, Warning, Destructive with accessible labels.
9. Status / Draft, In review, Changes requested, Approved, Published, Scheduled, On Air, Interrupted, Ended, Replay.
10. Live player shell / Waiting, Playing, Buffering, Offline, Ended, Replay, Error.
11. Timed update / event time, author, verified mark, link and media attachments.
12. Workspace patterns / App sidebar, table row, activity record, KPI summary, approval action, article preview.
13. Modal and drawer / Confirm publish, Discard draft, Filter, Mobile navigation, Share sheet.
14. Empty state / no results, no saved stories, no upcoming streams, missing media, permissions denied.

## 5. Screen-by-screen proposed layouts

### 01 / Design system
Color specimen, typography specimen, primary and secondary buttons, labels, status indicators, icon preview, form field and motion scale. The full library must eventually include token-bound components, variants and interactive descriptions in Figma; this HTML is the **visual concept preview**, not a published Figma component library.

### 02 / Homepage
A masthead with small editorial utility, prominent lead reporting, five latest highlights in a variable-density right rail, Lagos location discovery, distinctive three-story modules and a dedicated dark Studio entry. The approved homepage content architecture still includes Government, Grassroots, Business and Personalities modules; the preview shows the design language of these modules rather than every section at full length. Critical decisions: masthead authority, first viewport density, mobile hero crop, clear distinction between live video and standard news.

### 03 / Article reading
Large headline and deck; transparent byline; editorial image and caption; optional sticky save/share tools; long-form type; contextual pull-quote and related-story discovery. Additional production states: audio/video embeds, correction history, source references, inline ads, text scaling, structured data and bookmark confirmation.

### 04 / Newsroom authentication
Brand editorial panel plus a minimal form in a clear two-column desktop composition and compact mobile composition. Error, password reset, expired invitation and verification confirmation will use this visual vocabulary. Preserve Payload's proven auth logic; do not implement authentication as a fake custom client-only form.

### 05 / Newsroom dashboard
Role-aware queue, calm sidebar, compact count summaries, article status, review priorities and quick creation. In the design preview, all counts/stories are fictional examples and **not real CMS data**.

### 06 / Live studio
Dark page with state-aware player, companion verified update timeline, upcoming events and replay catalogue. The concept has a functional state selector for Scheduled / On Air / Interrupted / Ended / Replay. Actual video playback/OBS and backend polling are not implemented in this design-only file.

## 6. Motion and microinteraction specifications
| Interaction | Duration | Easing | Notes |
| --- | --- | --- | --- |
| Navigation and button press | 150ms | ease-out | No movement that delays action |
| Image hover / media emphasis | 220ms | ease-out | Maximum scale ~1.025, only on hover-capable devices |
| Filters and toolbar states | 180–240ms | ease-out | Update result count and announce to screen readers |
| Panel entrance | 280–320ms | cubic-bezier(.2,.8,.2,1) | Optional motion; never shift important reading text |
| Live event status change | 150–200ms | ease-out | Text label must remain visible; avoid constant blinking |
| Reduced motion | 0ms | none | Honor `prefers-reduced-motion` |

## 7. Interaction and UX decisions needing formal testing
- Video streaming states must correspond to actual provider/backend state. Never show fabricated viewer counts.
- A user can read verified text updates during network degradation; provide a retry path for the video.
- A signed-in journalist can create and submit a story but cannot publish. An editor can approve, while only authorized publishing staff can publish.
- Saved stories and location preferences require actual reader auth, which is not implemented in the design prototype.
- Local media uploads must be replaced with persistent object storage before production reliability review.
- A newsroom dashboard must be designed around editorial tasks, not vanity analytics.

## 8. Design approval checklist
- [ ] Newsprint + Studio Night visual direction approved.
- [ ] Typeface pairing and hierarchy approved.
- [ ] Homepage desktop/mobile compositions approved.
- [ ] Article reading desktop/mobile compositions approved.
- [ ] Login desktop/mobile compositions approved.
- [ ] Dashboard layout approved.
- [ ] Broadcast states, timeline and playback composition approved.
- [ ] Iconographic and illustration direction approved.
- [ ] Motion guidance and reduced motion accepted.
- [ ] Next Figma production pass authorized after tool access restored.
- [ ] Production implementation authorized separately; currently **not authorized**.

## 9. Validation disclosure
- Browser automation in this environment refused local page navigation; browser-rendered screenshot testing was not available.
- Source validation passed for the HTML structure, stylesheets (no CSS parse errors), and JavaScript syntax. The interface should be reviewed directly by opening the HTML file in a browser.
- The OgasTV Figma Design file was created, but no canvas design edits could be made because the connected Figma account reached its Starter-plan MCP limit. The Figma file currently should be regarded as a **placeholder**, not the deliverable.

## Links
- Figma placeholder: https://www.figma.com/design/mXuG7klmjOcj6BKXVRDvge
- Local design preview: `OgasTV_Africa_Design_Review_v1.html`