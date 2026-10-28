# Physical device testing — pending device access

No physical iPhone or Android test has been completed. Chromium viewport checks are documented separately in MOBILE-VERIFICATION.md.

## Connect

Use a phone and this computer on the same Wi-Fi. The default local-only server cannot be reached from another device. To explicitly enable LAN testing, start a separate server in PowerShell:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3011'
npm.cmd start
```

On the phone, open `http://<computer Wi-Fi IPv4 address>:3011/`. `localhost` and `127.0.0.1` on the phone refer to the phone itself. The LAN server is opt-in; no LAN server was started during preparation. Closing that server stops access. The usual app server defaults to 127.0.0.1 when HOST is unset.

Have two short MP3/WAV files available in the phone's file picker. Controlled fixtures can be created on the computer using the scripts in MP3-VERIFICATION.md and transferred to the phone by the user.

## Record before testing

- Phone model, OS version, browser/version, and portrait/landscape dimensions.
- Audio file formats, sizes, durations, and sample rates if known.
- Whether results are directly observed or reported by the person operating the phone.

## Run on iPhone Safari and Android Chrome

- Select track A and B through the real phone file picker; cancel and reopen the picker once.
- Enter a fractional cue, a negative gain, and a BPM using the virtual keyboard. Verify the focused control remains visible and can be edited without clipped labels.
- Render a short DJ transition. Confirm controls recover after rendering and status text is readable.
- Tap Play, verify audible output and advancing time, then pause, seek, and resume.
- Download the mixed WAV. Locate it in the phone's download/files app and verify playback there.
- Switch to layered mode, adjust the blend by touch, and toggle speed matching by tapping its label. Render again.
- Rotate portrait/landscape with files loaded; verify no overflow, lost track state, or inaccessible controls.
- Import an empty/damaged file, confirm an actionable error, and recover by selecting a valid file.
- Background/foreground the browser and document interruptions or permission prompts. Do not assume desktop playback behavior applies.
- Increase fixture duration gradually and record memory/decoder/render failures rather than inferring mobile capacity from desktop limits.

## Results

All physical-device cases are **pending**. Audio generation remains disconnected; no generation service is needed for this checklist. The computer-to-phone LAN page uses HTTP, so secure-context-only features such as clipboard access may be unavailable; test the mixer file/render/playback/download workflow independently of clipboard actions.
