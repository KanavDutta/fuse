# ElevenLabs Music setup

The server integration is implemented. A real account with Music API access and a configured server-side key are required. A configured key is not automatically verified for Music access.

1. Create/sign in to your account at https://elevenlabs.io/. Review Music API eligibility and current pricing. The official quickstart says Music API access requires a paid account: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music.
2. Create a key yourself at https://elevenlabs.io/app/api/api-keys. Review the Music permissions and spending controls available in your account. Account creation, payment, and key-permission changes stay under your control.
3. Copy .env.example to .env in this project folder and put your key after ELEVENLABS_API_KEY=. Keep it out of chat, screenshots, browser code, and GitHub. .env is ignored by Git and is not served by the app.
4. Restart the server with Node.js 20.12+ (npm start). Visit its localhost address. If another server is running on port 3000, use another PORT and open that address. The app displays configured status; this is not a live Music entitlement check.
5. Choose Song workspace → Try an example → Review generation. Start with 10 seconds for your first real test. Review the prompt and credit-use notice before submitting. The request uses your account credits.

## Errors and provider verification

An account-read request may return missing_permissions for a key restricted to generation. That alone does not prove the key is invalid or confirm Music access. Check the Music permission and your plan; the app's actual generation request will show an actionable error if rejected. There are no automatic paid retries. No account-read permission is required by the app's generation code.

401 means authentication or key permissions were rejected; 403 can indicate account/plan access; 429 can indicate rate or credit limits; 422 means the request was rejected. Adjust the relevant setting before retrying. Cancellation stops local work, but provider charges may continue. If a key is ever exposed, replacing it is recommended.

## Request and local storage

The server calls https://api.elevenlabs.io/v1/music using the xi-api-key header and model music_v2_5. It sends the reviewed prompt, duration in milliseconds, and force_instrumental. Prompt limit: 4,100 characters. App durations: 3–240 seconds, with 10–240 second choices in the UI. Output uses the provider's automatic MP3 format. Imported audio is not uploaded. Reference title/artist fields are omitted from automatic prompts; do not manually add restricted material.

API reference: https://elevenlabs.io/docs/api-reference/music/compose.

Jobs and generated audio are stored in data/generated/, excluded from Git. Download completed tracks to keep a separate copy. The latest job is recoverable across browser reloads; unfinished jobs after server restart require deliberate review/retry. Paid generation is available only on localhost. The phone LAN address supports mixing, not generation.
