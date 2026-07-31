# Voiceover, captions, caption.txt, title.txt

Four text/media artifacts per diagram, on top of the rendered videos:

- `caption.txt` — the long-form social post copy (Instagram/LinkedIn body). /infographic style.
- `title.txt` — the short upload title / file name.
- `vo-script.txt` — the ~44-word narration script (input to the voiceover).
- `<base>-reel-voice-over.mp4` — the reel with brand voiceover + Submagic captions + emojis.

## title.txt

One line, Title Case, 3 to 8 words, developer-searchable. Works as a clean file name: no emojis,
no hashtags, no quotes, no trailing punctuation, no dashes. Prefer "How X Works", "Why X ...",
"The X ...", or "X vs Y". Keep real tech names. Examples: `How Kafka Works`,
`Optimistic vs Pessimistic Locking`, `The N+1 Query Problem`.

## caption.txt (mentor voice, /infographic style)

Plain text, no markdown, no emojis, no en/em dashes. `→` is the only bullet marker. No sentence
starts with "I". Shape:

```
<hook line — reframe a misconception>

<one or two reframing lines>

Here is the mental model you should have
→ step one
→ step two
→ ... (about 6 arrows)

The mistake <juniors/teams> make is <...>
<two or three short lines>

Senior engineers <...>
<two or three short lines>

<one memorable closing line>

<a question that invites a reply>

Share your thoughts below

Follow Amigoscode for lessons that turn developers into senior engineers
```

## vo-script.txt (the narration)

One line, plain text. 40 to 48 words so the brand voice lands near 18 to 21 seconds (it reads at
~2.6 words/sec; over ~48 words drifts past 22s). Mentor voice, second person, present tense. Open
with a reframe/hook, walk the mechanism in order, close with one memorable line. No em/en dashes.
No sentence starts with "I". Use the real technical nouns (producer, consumer, partition, offset,
cache, thread, lock, retry, index, pool, token) so the on-screen keyword captions get emoji hits.
Reference:

> Kafka is not a queue, it is a durable log. Producers append records to a topic, split into
> partitions so it can scale. A consumer group shares those partitions, and each consumer tracks
> its own offset. Nothing is ever deleted, so you can always replay the log.

## Voiceover + caption render pipeline

Three node scripts in `$SKILL/scripts/`, then one ffmpeg composite. Run them from the workspace
`$FLOWS`. The ElevenLabs API key is read from `$ELEVEN_LABS`, then `$SKILL/.env`, then `~/.env`;
never print it. Default voice is the Amigoscode brand voice `BtWabtumIemAotTjP5sk` (override with
`VOICE_ID=`, or `voiceId` in `~/amigoscode-skills/flows-diagram-config.json`).

```zsh
folder=kafka-flow ; base=kafka-flow           # base = the reel's outBase
TEXT=$(cat $folder/vo-script.txt)
VO=$folder/$base-vo.mp3
WORDS=/tmp/$base-words.json
CAPS=/tmp/caps-$base
REEL=$folder/$base-reel.mp4
OUT=$folder/$base-reel-voice-over.mp4

# 1. TTS  -> $folder/$base-vo.mp3
node "$SKILL/scripts/gen-vo.mjs" "$folder" "$base" "$TEXT"
# 2. forced alignment -> word timings json
node "$SKILL/scripts/vo-align.mjs" "$VO" "$TEXT" "$WORDS"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VO")
# 3. Submagic caption overlay -> transparent PNG frames (args are FIXED for reels)
node "$SKILL/scripts/caption-render.mjs" "$WORDS" "$CAPS" 1080 1920 30 "$DUR" 1545 60 1420
# 4. composite: loop the 10s reel under the captions, mux the voiceover, cut at audio length
ffmpeg -y -stream_loop -1 -i "$REEL" -framerate 30 -i "$CAPS/f_%04d.png" -i "$VO" \
  -filter_complex "[0:v][1:v]overlay=0:0[v]" -map "[v]" -map 2:a \
  -t "$DUR" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k \
  -movflags +faststart "$OUT"
rm -rf "$CAPS"        # always delete caption scratch frames
```

Notes:
- The reel is 10s; `-stream_loop -1` loops it and `-t $DUR` cuts at the audio length. Use `-t`,
  never `-shortest` (with an infinite loop `-shortest` overshoots).
- `caption-render.mjs` positional args: `<wordsJson> <framesDir> <W> <H> <fps> <dur> <capCenterY>
  <fontSize> <emojiY>`. For the 1080x1920 reel the tuned values are `1545 60 1420` — keep them.
- Emojis animate in (fade + rise + easeOutBack bounce) on keyword hits. The keyword→emoji map is
  built into `caption-render.mjs` and already covers every topic in the series; override for one
  run with `EMOJI_JSON=<path-to-json>` (merged over the defaults).
- Chrome must launch WITHOUT `--default-background-color` (it crashes); `omitBackground:true`
  already yields transparency.

## Batch across many diagrams

Agents write the text files (`caption.txt`, `title.txt`, `vo-script.txt`) in parallel — one
general-purpose agent per 3 to 4 diagrams, each handed the exact style spec above. Then run the
voiceover render **sequentially** in one resumable driver with a `done_file` (puppeteer + ffmpeg
contend, so never parallelize the render). Manifest is `"folder outBase"` pairs; note the outBase
often differs from the folder (e.g. `ratelimit-flow` → `ratelimit`). Durations land ~18 to 23s;
trim a `vo-script.txt` and re-render just that one if it drifts too long.
