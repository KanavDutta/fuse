# Mobile viewport verification — October 28, 2026

Tested the local mixer in Chromium with explicit viewport overrides. This covers responsive layout and browser interactions at phone/tablet dimensions, not physical mobile hardware or mobile Safari.

## Problems found and fixed

- At 320 px, two-column settings clipped the selected mix-mode name and crowded long labels. Mixer fields now stack in one column through 600 px; wider layouts retain two columns.
- Phone inputs inherited 11 px text and several were only 40 px tall. Mixer inputs/selects now use 16 px text and at least 48 px height through 720 px.
- Checkbox boxes were small with limited surrounding space. Full labels now provide at least 48 px height, with 22 px checkbox indicators.
- Mixer headings competed for horizontal space. Phone headings now stack above the processing label.
- Render/download actions now fill the available phone width, with at least 48 px height. The audio element remains contained within its panel.

No horizontal overflow was hidden as a workaround.

## Layout checks

| Viewport | Mixer settings | Overflowing page elements |
| --- | --- | --- |
| 320 × 740 | One column | None |
| 375 × 812 | One column | None |
| 390 × 844 | One column | None |
| 430 × 932 | One column | None |
| 520 × 800 | One column | None |
| 600 × 800 | One column | None |
| 768 × 1024 | Two columns | None |
| 844 × 390 | Two columns | None |

At 320 px, numeric fields measured 48 px high, file inputs 50 px, and the select 49 px. Checkbox label heights ranged from approximately 61–83 px due to wrapping. With rendered output, the player and download link both measured 236.5 px wide; the download link was 48 px tall. The document and rendered mixer remained within the viewport.

## Interaction checks

At 390 px, imported stereo CBR and mono VBR MP3 fixtures; rendered a 30-second DJ transition; started/paused playback (time advanced with no media error); downloaded the WAV. Switched to layered mode, clicked the speed-match label, set 150 BPM, adjusted the blend slider using keyboard input (50 → 51), and rendered the expected 16-second mix. Re-rendered after the final CSS change and checked the result at 320 px. No captured browser error/warning logs.

The screenshot [mobile-320-verified.jpg](artifacts/mobile-320-verified.jpg) shows the rendered player and full-width download action. [mobile-390-full.jpg](artifacts/mobile-390-full.jpg) records the full phone layout. Temporary viewport overrides were reset after testing.

## Reproduce and limits

Start the local app, set the browser's responsive viewport to the sizes above, and test both mix modes with the fixtures described in [MP3 verification](MP3-VERIFICATION.md). Inspect document width, field wrapping, input/label dimensions, and rendered audio/download controls. The browser cases are tool-driven and not part of the Node test suite.

Physical touch input, phone file pickers, virtual-keyboard behavior, mobile Safari audio permissions, background playback, and mobile memory limits remain unverified. Slider interaction here used keyboard input rather than a physical touch gesture. No audio-generation integration was enabled; the provider-disconnected server tests remain in the automated suite.
