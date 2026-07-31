# Amigoscode Skills Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated | Summary |
|-------|---------|--------------|---------|
| infographic | 1.1.0 | 2026-06-23 | Generate branded "HOW X WORKS" educational infographic diagrams for backend/Java topics, exported as a final PNG plus caption. |
| carousel | 1.0.0 | 2026-06-23 | Generate branded LinkedIn carousel slides (PNGs), a combined PDF, beat-synced MP4s, a GIF, and platform captions for any tech topic. |
| explainer-video | 1.0.0 | 2026-06-24 | Produce a branded vertical explainer video (1080x1920 MP4) teaching one concept in ~40s: 8 animated scenes, ElevenLabs voiceover, word-by-word captions, synced sound effects, plus a LinkedIn caption. |
| x-card | 1.0.0 | 2026-06-23 | Generate a dark-mode X (Twitter) style quote card (1080x1350 PNG) with profile photo, blue tick, name, handle, and stats, plus a LinkedIn caption. |
| linkedin-poster | 1.0.0 | 2026-06-23 | Fully autonomous LinkedIn poster that publishes immediately or schedules text, carousel, or image posts via Playwright. |
| nanobanana | 1.0.0 | 2026-06-27 | Generate and edit images with Google's Gemini 3.1 Flash Image model: text-to-image, single-image edits, style transfer, and multi-image compositing. |
| headshots | 1.1.0 | 2026-06-28 | Generate polished LinkedIn-style profile-picture variations from one reference photo, preserving the person's identity. 11 options including a restore-only mode, picked via checkbox; fans out one subagent per style. Self-contained Gemini generator. |
| flows-diagram | 1.0.0 | 2026-07-31 | Animated backend flow diagrams (React/SVG scenes) rendered to a 1440x1440 square MP4, a 960x960 looping GIF, and a 1080x1920 branded reel, plus ElevenLabs voiceover, word-by-word captions, caption.txt, and title.txt. |

## Recent Changes

### 2026-07-31
- Added `flows-diagram` skill: animated backend/Java/Spring/database diagrams (square MP4 + looping GIF + branded reel) with voiceover and word-by-word captions

### 2026-06-28
- `headshots`: added a `restore` option (enhance/repair the original photo with no restyle), selectable in the checkbox prompt alongside the styled looks

### 2026-06-27
- Added `headshots` skill: LinkedIn-style profile-picture variations from a reference photo (10 styles, checkbox selection, one subagent per style, self-contained Gemini generator)
- Added `nanobanana` skill: AI image generation and editing via Gemini 3.1 Flash Image (text-to-image, edits, style transfer, multi-image compositing)

### 2026-06-24
- Added `explainer-video` skill: branded vertical explainer videos (HyperFrames) with ElevenLabs voiceover, word-by-word captions, and synced sound effects

### 2026-06-23
- Initial version tracking added
- Added `infographic` skill for branded "HOW X WORKS" educational diagrams
- Added `carousel` skill for branded carousel slides, PDF, videos, and captions
- Added `linkedin-poster` skill for autonomous LinkedIn publishing and scheduling
- Renamed the repo to `amigoscode/skills`
- Renamed the `linkedin-carousel` skill to `carousel` (reinstall if you had the old name)
- Standardized skill output to `~/amigoscode-skills/<skill-name>/`
- Added `x-card` skill for dark-mode X (Twitter) style quote cards
