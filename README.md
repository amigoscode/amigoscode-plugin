# Amigoscode Skills for AI Agents

A collection of AI agent skills from [Amigoscode](https://amigoscode.com) for creating branded technical content. Built for developers and educators who want AI coding agents to help produce educational infographics and publish to LinkedIn. Works with Claude Code, OpenAI Codex, Cursor, Windsurf, and any agent that supports the [Agent Skills spec](https://agentskills.io).

These skills focus on turning backend, Java, and Spring topics into polished, branded visuals and social posts. Generate a "HOW X WORKS" diagram for a concept, then publish or schedule it on LinkedIn, all from your agent.

**Contributions welcome!** Found a way to improve a skill or have a new one to add? [Open a PR](#contributing).

Run into a problem or have a question? [Open an issue](https://github.com/amigoscode/skills/issues) and we are happy to help.

## What are Skills?

Skills are markdown files that give AI agents specialized knowledge and workflows for specific tasks. When you add these to your project, your agent can recognize when you are working on a content task and apply the right templates, branding, and best practices.

## Available Skills

<!-- SKILLS:START -->
| Skill | Description |
|-------|-------------|
| [carousel](skills/carousel/) | Generate branded LinkedIn carousel slides (1080x1350px PNGs), a combined PDF, beat-synced MP4s, a GIF, and platform... |
| [explainer-video](skills/explainer-video/) | Produce a branded Amigoscode vertical explainer VIDEO (1080x1920 MP4) that teaches one backend, Java, data-structures,... |
| [flows-diagram](skills/flows-diagram/) | Produce a branded Amigoscode animated BACKEND-DIAGRAM video: a React/SVG flow diagram (controllers, queues, threads,... |
| [headshots](skills/headshots/) | Generate polished LinkedIn-style profile-picture variations from a single reference photo, while keeping the person's... |
| [infographic](skills/infographic/) | Generate 'HOW X WORKS' educational infographic diagrams for Amigoscode — hand-drawn style diagrams about backend/Java... |
| [linkedin-poster](skills/linkedin-poster/) | Fully autonomous LinkedIn poster. Drives the LinkedIn web composer via Playwright/TypeScript to publish posts... |
| [nanobanana](skills/nanobanana/) | Generate and edit images using Google's Gemini 3.1 Flash Image Preview model via the @google/genai SDK. Use this skill... |
| [x-card](skills/x-card/) | Generate a social media quote card styled like a dark-mode X (Twitter) post: profile photo, blue verified tick, name,... |
<!-- SKILLS:END -->

## Installation

### Option 1: CLI Install (Recommended)

Use [npx skills](https://github.com/vercel-labs/skills) to install skills directly:

```bash
# Install all skills
npx skills add amigoscode/skills

# Install specific skills
npx skills add amigoscode/skills --skill infographic carousel explainer-video flows-diagram x-card linkedin-poster

# List available skills
npx skills add amigoscode/skills --list
```

This automatically installs to your `.agents/skills/` directory (and symlinks into `.claude/skills/` for Claude Code compatibility).

### Option 2: Claude Code Plugin

Install via Claude Code's built-in plugin system:

```bash
# Add the marketplace
/plugin marketplace add amigoscode/skills

# Install the Amigoscode skills
/plugin install amigoscode
```

Then the skills resolve as `amigoscode:infographic`, `amigoscode:carousel`, `amigoscode:x-card`, and `amigoscode:linkedin-poster`.

### Option 3: Clone and Copy

Clone the entire repo and copy the skills folder:

```bash
git clone https://github.com/amigoscode/skills.git amigoscode-skills
cp -r amigoscode-skills/skills/* .agents/skills/
```

### Option 4: Git Submodule

Add as a submodule for easy updates:

```bash
git submodule add https://github.com/amigoscode/skills.git .agents/amigoscode-skills
```

Then reference skills from `.agents/amigoscode-skills/skills/`.

### Option 5: Fork and Customize

1. Fork this repository
2. Customize skills for your specific needs
3. Clone your fork into your projects

## Per-skill setup

Each skill has its own dependencies and one-time setup. See the skill READMEs:

- [`skills/infographic/README.md`](./skills/infographic/README.md) — needs a `GEMINI_API_KEY` and `npm install` for the diagram generator and Playwright screenshot step.
- [`skills/carousel/README.md`](./skills/carousel/README.md) — needs `npm install` + `npx playwright install chromium`; Python 3 with `librosa` and `ffmpeg` for the beat-synced videos.
- [`skills/explainer-video/README.md`](./skills/explainer-video/README.md) — needs an `ELEVEN_LABS` API key (Creator tier for cloned voices), `ffmpeg`/`ffprobe`, and `npx hyperframes` (Whisper transcription + render).
- [`skills/flows-diagram/README.md`](./skills/flows-diagram/README.md) — needs Google Chrome, `ffmpeg`/`ffprobe`, `npm install` (puppeteer-core), and an `ELEVEN_LABS` API key for the voiceover.
- [`skills/x-card/README.md`](./skills/x-card/README.md) — needs Python 3 with Pillow (`pip install pillow`). Fonts and badge are bundled.
- [`skills/linkedin-poster/README.md`](./skills/linkedin-poster/README.md) — needs `npm install` + `npx playwright install chromium`, then a one-time LinkedIn login that is saved for future runs.

Secrets (`.env`) and personal config (`config.json`, saved LinkedIn sessions) are gitignored and never bundled. Copy the `.example` files and fill in your own.

## Usage

Once installed, just ask your agent to help with content tasks:

```
"Create an infographic about how Kafka works"
→ Uses infographic skill

"Make a HOW X WORKS diagram for Spring Boot"
→ Uses infographic skill

"Create a LinkedIn carousel about the top 10 Git commands"
→ Uses carousel skill

"Make a flows diagram for the outbox pattern"
→ Uses flows-diagram skill

"Make an X card: Juniors write code. Seniors delete it."
→ Uses x-card skill

"Post this on LinkedIn now"
→ Uses linkedin-poster skill

"Schedule this carousel on LinkedIn for tomorrow morning"
→ Uses linkedin-poster skill
```

You can also invoke skills directly:

```
/infographic
/carousel
/flows-diagram
/x-card
/linkedin-poster
```

## Contributing

Found a way to improve a skill? Have a new skill to suggest? PRs and issues welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or improving skills.

## License

[MIT](LICENSE) - Use these however you want.
