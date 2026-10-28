# Mixer verification — October 28, 2026

Verified in the app's Chromium in-app browser against a local Node server on port 3010. Test audio was synthetic stereo WAV (20 seconds, 44.1 kHz, 120 BPM pulse, different carrier frequencies and amplitudes). No personal music files, uploads to third parties, or generation providers were used.

## Browser checks

- Import both fixtures; both estimated at 120 BPM.
- Render default DJ transition: B starts at 10 seconds, 8-second fade, 30-second output. Downloaded PCM16 stereo WAV; duration and headers verified independently.
- Start and pause browser playback. Playback time advanced; media readyState was 4 with no media error. No captured browser error/warning logs.
- Switch to layered blend with an empty, hidden transition-start field. Render succeeds and ends at 20 seconds rather than adding ten seconds of silence. Irrelevant fields are now disabled.
- Enable speed matching at 150 BPM with cues A=2 seconds and B=4 seconds. Layered duration is 14.4 seconds, as expected from 18 / 1.25. Speed matching still changes pitch.
- Clear B's BPM while speed matching is enabled: actionable error, no stale result.
- Import invalid WAV: actionable decode error, render disabled. Import a valid file again: rendering recovers.
- Transition with A cue=10 seconds: rejects insufficient source duration for the fade.
- Correlated inputs, +6 dB source gain and +6 dB bass, input leveling off: export attenuated by 1.9 dB. Independently measured sample peak is -1.000 dBFS, with no full-scale clipped samples.

## Controlled comparison

| Measurement | Before | After |
| --- | ---: | ---: |
| Default mix sample peak | -13.058 dBFS | -7.141 dBFS |
| Left-channel RMS at 2–3 seconds | -23.555 dBFS | -17.486 dBFS |
| Left-channel RMS at 14–15 seconds (fade midpoint) | -25.874 dBFS | -18.101 dBFS |
| Midpoint dip relative to 2–3 seconds | 2.319 dB | 0.615 dB |

The improvement is specific to these controlled fixtures. It does not establish quality for arbitrary songs. The revised bass envelope avoids the previous double -12 dB shelf cut; level recovery raises output by up to 6 dB without exceeding a -1 dBFS **sample** peak. This is not a true-peak limiter or LUFS mastering.

Level analysis now measures contiguous blocks to avoid deterministic strided-sample aliasing, gates silence, and analyzes the selected source region. A 25 Hz high-pass filter reduces DC/sub-bass rumble. Unit regressions cover silent padding, periodic waveforms, bass envelopes, output gain bounds, nonfinite samples, and mismatched channel lengths.

## Reproduce

1. `node scripts/mixer-fixtures.mjs`
2. `npm start` (or set PORT before starting).
3. Import `test/fixtures/track-a.wav` and `track-b.wav` through Mix two songs.
4. Use the scenarios above, download each WAV, and inspect it with `node scripts/inspect-wav.mjs "<download path>"`.
5. `npm test` — 16 automated tests pass, including the provider-disconnected server assertions. Browser steps are manual/tool-driven, not part of this automated suite.

## Remaining verification

MP3 follow-up coverage is documented in [MP3 verification](MP3-VERIFICATION.md). Real-song subjective listening, other codec coverage, long-file/mobile memory testing, and mobile layout checks remain. Playback functionality was verified; no claim of human audition or production-quality mastering is made. Stem separation, key matching, pitch-preserving stretching, and automatic downbeat detection remain unimplemented. Audio generation remains disconnected (`connected: false`; generate endpoint returns 503).
