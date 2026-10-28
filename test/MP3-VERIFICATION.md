# MP3 verification — October 28, 2026

Tested locally in the Chromium in-app browser on port 3010. Audio fixtures were encoded from the controlled 20-second WAV test signals. No personal music files or external audio-generation services were used. Browser decoding remains native Web Audio (`decodeAudioData`); no MP3 decoder or encoder was added to the shipped app.

## Coverage

- **CBR stereo:** 192 kbps MP3, 44.1 kHz, two channels; imported successfully, estimated at 120 BPM.
- **VBR mono:** LAME quality 3 MP3, 48 kHz, one channel, title metadata; imported successfully, estimated at 120 BPM. Native decoding resamples it for the 44.1 kHz mix.
- **MP3 + MP3 DJ transition:** rendered, downloaded as PCM16 stereo WAV, and played/paused in the browser. Media time advanced, readyState=4, no media error. Approximate duration 30 seconds (within one sample after resampling).
- **MP3 + MP3 layered mix with cues/speed:** A cue 1.25 seconds; B cue 2.5 seconds; target 150 BPM from 120 BPM sources; output 15 seconds, as expected. Speed matching changes pitch.
- **WAV + MP3:** imported and rendered after error recovery, confirming mixed-format use.
- **Damaged MP3:** header-only 128-byte fragment rejected with a specific decode message. Render disabled; old BPM, cue, and cue bound cleared; file input reset so the same filename can be retried.
- **Empty MP3:** rejected before decoding with an explicit empty-file message. Subsequent valid import recovers.

## Export measurements

The downloaded MP3-derived transition is 2-channel, 44.1 kHz PCM16. Independently inspected duration: 29.999977 seconds; sample peak: -8.005 dBFS; first/last samples zero; maximum adjacent-sample change: 0.011292. Sample-peak protection remains enabled. These results describe controlled fixtures, not arbitrary music quality or true-peak certification.

## Fixes

- File selection no longer overwrites decoding status with “Settings changed.”
- Failed imports clear stale BPM/cue metadata and allow retrying the same filename.
- Empty files and invalid decoded buffers have explicit validation.
- Codec failures provide a plain-language damaged/unsupported-file message.

## Reproduce

1. `node scripts/mixer-fixtures.mjs`
2. `node scripts/mp3-fixtures.mjs <path-to-ffmpeg>` — requires an external FFmpeg with libmp3lame, for testing only. In this session the encoder came from npm package `@ffmpeg-installer/win32-x64@4.1.0`, extracted under ignored `test/tools/`. No package dependency was added.
3. Start the app, import the fixtures from `test/fixtures`, and follow the cases above.
4. Download the mix, then run `node scripts/inspect-wav.mjs "<download path>"`.
5. Run `npm test` for import-validation, mixer, recipe, and disconnected-provider checks. Browser cases are tool-driven and are not part of the Node test suite.

## Limits

This is Chromium coverage for two common MP3 encodings and two malformed files. Other browsers, unusual encodings, real-song audition, and long/mobile memory stress remain unverified. Some partially truncated MP3s may decode as shorter audio; this does not promise comprehensive bitstream integrity validation. Output remains WAV. Audio generation remains disconnected.
