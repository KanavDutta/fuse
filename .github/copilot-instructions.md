# Copilot instructions

## Commands

- Requires Node.js 20 or newer; there are no package dependencies to install.
- Start the app with `npm start`, then open `http://127.0.0.1:3000`. Set `PORT` to change the port.
- Run tests with `npm test` (`node --test`). Tests live in `test/*.test.mjs`. To select one named test, add `--test-name-pattern="pattern"` before the file path. GitHub Actions runs the suite on pushes and pull requests.

## Architecture

- `server.mjs` is a small native Node HTTP server. It serves files from `public/` and handles `/api/status` and `/api/generate`; status is disconnected and generation deliberately returns HTTP 503 until a real provider is implemented.
- `public/index.html` defines the studio, recipe library, and imported-audio player. `public/style.css` contains the responsive layout and visual styles. `public/app.js` owns browser-side form state, rendering, storage, brief export, and audio playback; there is no frontend framework or build step.
- `public/mixer.js` implements two-track native Web Audio mixing. `mixer-dsp.js` provides tempo estimates, gated RMS level balancing, bass envelopes, and WAV encoding. `audio-import.js` validates imported audio. No audio is uploaded for mixing.
- `public/song.js` handles ten-section manual song-note export; `public/recipes.js` commits saved recipe updates to local storage. Verification reports distinguish browser checks from pending physical-device tests.
- The form's `collect()` function is the shared representation used by the live preview, saved recipes, and generation brief. Keep new creative controls wired through that data flow.
- Recipes are stored in this browser's `localStorage` under `fuse-recipes`. Imported audio is session-only and uses a browser object URL; release the URL when replacing the file and on page unload.
- Track titles are user-provided context only. The app does not fetch or analyze reference audio, and must not present a saved recipe or exported brief as generated audio. The README describes the intended later provider integration and its prerequisites.

## Repository conventions

- Keep the implementation dependency-free and use native browser APIs and Node built-ins unless the project scope changes.
- Build dynamic interface elements with DOM APIs and assign user-provided values as text (`textContent`), rather than interpolating them into HTML.
- Surface unavailable integrations and browser-storage or playback failures explicitly in the interface. Do not simulate a successful generation; the current API contract returns JSON errors with HTTP 503.
- Preserve the existing recipe shape: each entry has an `id`, `created`, and `data`; `data.references` is an array of reference objects. Keep reference inputs and generated summaries consistent with this shape.
- The static server accepts only `GET` and `HEAD` for files, resolves requested paths beneath `public/`, and sets `X-Content-Type-Options: nosniff`. Preserve these boundaries when changing file serving.
