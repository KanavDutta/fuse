# FUSE — Song Fusion Studio

Local song-fusion studio with two-track DSP mixing, manual songwriting, and local ACE-Step generation and optional server-side ElevenLabs Music generation.

## Run

Requires Node.js 20.12 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:3000. Set `PORT` to use another port. The server defaults to local-only access. For opt-in same-Wi-Fi phone testing, set `HOST=0.0.0.0` and use this computer's Wi-Fi IPv4 address from the phone. See [the physical-device checklist](test/PHYSICAL-DEVICE-CHECKLIST.md); physical-device results are still pending access to a phone.

## Available now

- Local two-track audio mixing: editable BPM estimates, source cues, optional speed matching (changes pitch), bass EQ/swapping, RMS level balancing, equal-power layered blends or timed DJ transitions, playback, and stereo WAV export.
- Two or three track references with explicit musical qualities.
- Genre, mood, tempo, duration, vocals, instruments, rhythm, and creative direction.
- Live recipe summary; browser-local recipe saving, reopening, updating, and deletion.
- Update an opened recipe or use Save as copy for an alternate version. Draft recovery remembers which recipe you were editing.
- Editable generation briefs, copying, and text export. Rebuild from the current recipe to replace manual edits.
- Automatic browser-local working draft recovery, including unfinished fields and brief edits.
- Manual songwriting workspace with all ten sections, lyrics, chord progressions, arrangement/transition notes, key, meter, vocal direction, mix notes, and style tags.
- Copy or download complete song notes even before reference fields are complete. Notes are also included when building a generation brief.
- Existing recipes reopen with an empty song workspace when no song notes were saved.
- Local audio import, playback, seeking, volume, and download.
- Responsive layout and keyboard-accessible controls.

Imported audio is never uploaded. Recipes are stored in this browser's localStorage, not an account. Clearing browser data removes recipes and the working draft. Clear or New fusion starts a fresh working draft. Audio files are session-only. The optional Google Fonts stylesheet falls back to system fonts when offline.

## Free local music generation

ACE-Step 1.5 has been installed and tested on this computer. A 10-second stereo instrumental completed in 21 seconds using low-memory GPU settings, without API credits. See [local installation and startup](docs/LOCAL-GENERATION.md). Start the model with `npm run local:engine`, then start FUSE in another terminal. Select `FUSE_GENERATION_PROVIDER=ace-step` in your private `.env`. Local mode supports instrumental clips up to 30 seconds and never falls back to a paid provider.

## ElevenLabs Music generation

Follow [the setup guide](docs/ELEVENLABS-SETUP.md). Copy .env.example to .env, add ELEVENLABS_API_KEY privately, and restart. The server loads this ignored file using Node's built-in environment-file loader. Without a key, generation returns HTTP 503. A configured key is not proof that your account has Music access.

Open Song workspace, fill the recipe or try the example, then choose Review generation. Edit the prompt (maximum 4,100 characters), select duration, and explicitly submit with your ElevenLabs credits. The adapter sends POST /v1/music with music_v2_5 and automatic MP3 output. Reference title/artist fields are excluded from the automatically built prompt; broad qualities and original song notes are included. The review prompt is separate from the longer exported brief.

Jobs and generated MP3s are stored locally in ignored data/generated/. The browser remembers the latest job across reloads. Pending jobs interrupted by a server restart are marked failed; they are not silently retried. Cancellation aborts local work but cannot guarantee cancellation of provider processing or charges. Generated audio has a distinct player and download action, including HTTP range support for seeking.

Generation and generated-file routes are localhost-only with origin/host checks. LAN phone testing continues to support local audio mixing. Do not expose this personal server as a public generation service; hosted sharing needs account authentication, quotas, and deployment-specific storage.

No paid generation has been verified in this development session. Unit/integration tests use explicitly injected test responses, not a simulated production provider. See [generation verification](test/GENERATION-VERIFICATION.md).

## Checks

Run `npm test` for song-export and server checks. Browser checks should cover draft recovery after refresh, saved recipe reopening, manual brief preservation and rebuilding, text download/copy, imported-audio playback, and desktop/mobile layouts.

## Mix two imported songs

Open **Mix two songs**, import A and B (up to 50 MB and 10 minutes each), choose a layered blend or DJ transition, and set source cues. A starts at timeline zero; B starts at zero in a blend or at the transition start. Cues trim the start of each source. Correct the estimated BPM if needed. Optional speed matching changes pitch; it is not pitch-preserving time-stretching. Render up to 180 seconds, listen, and download the WAV. Output stops when the available mix audio ends. Changing any setting requires rendering again.

Files and mix results stay in memory and are lost on refresh; they are not saved with recipes. The mixer does not upload files or call an audio-generation provider. Import prepared stems for vocal/instrumental layering. Stem separation, key detection/pitch matching, automatic downbeats, pitch-preserving stretching, and LUFS normalization are not implemented. Tempo estimates can be ambiguous; align source cues by ear.

## Mixer quality and verification

Level balancing uses silence-gated contiguous RMS blocks from the selected audio region. A 25 Hz high-pass removes sub-bass rumble; complementary bass envelopes reduce the middle-of-transition dip. Optional output recovery adds at most 6 dB while keeping sample peaks at or below -1 dBFS. This is not LUFS normalization or true-peak limiting.

See [the browser verification report](test/MIXER-VERIFICATION.md) for tested scenarios, measured before/after levels, reproduction steps, and remaining checks. Generate local fixtures with `node scripts/mixer-fixtures.mjs`; inspect downloaded PCM16 WAVs with `node scripts/inspect-wav.mjs "path/to/mix.wav"`.

MP3 CBR stereo (44.1 kHz) and VBR mono (48 kHz) were tested through browser import, mixing, playback, and WAV download, including malformed-file rejection and recovery. See [MP3 verification](test/MP3-VERIFICATION.md) for scope and reproduction. Import decoding stays in the browser; no encoder or decoder dependency was added to the app.

Phone mixer layouts were checked at 320–600 px, plus tablet and landscape widths. Narrow settings stack into one column; phone inputs use 16 px text and larger touch areas. See [mobile viewport verification](test/MOBILE-VERIFICATION.md) for measurements, browser workflow checks, screenshots, and physical-device limitations.
