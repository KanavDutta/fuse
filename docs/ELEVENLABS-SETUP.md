# ElevenLabs Music setup

Generation is not connected yet. The current mixer, songwriting workspace, and exports work without an ElevenLabs account. This guide prepares the provider account; it does not claim the app is integrated.

1. Create or sign in to your account at https://elevenlabs.io/.
2. Check current Music API access and pricing. The official Music quickstart states that Music API access requires a paid account: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music. Account creation, plan selection, payment, and API-key creation should be completed by the account owner.
3. In the ElevenLabs dashboard, open Developers → API Keys and create a key for this project. Review the permissions and spending controls available in your account.
4. Keep the key out of chat, browser code, screenshots, and GitHub. When the server integration is ready, configure `ELEVENLABS_API_KEY` in a local ignored `.env` file or a deployment's server-side secret settings. The current server does not load `.env`; adding a key alone will not enable generation.
5. Tell the developer that the account/key is ready without sharing the key. The remaining integration needs request validation, a provider adapter, saved job status, cancellation/error handling, generated-audio storage, and a distinct generated-audio player.

## API contract to implement

Official endpoint: `POST https://api.elevenlabs.io/v1/music`, authenticated server-side with `xi-api-key`. It accepts either a prompt or a composition plan and returns audio. The prompt limit documented on October 28, 2026 is 4,100 characters; requested duration is 3,000–600,000 ms. The current app's full exported brief can exceed that prompt limit, so it must not be forwarded blindly or silently truncated.

See https://elevenlabs.io/docs/api-reference/music/compose for current models and parameters. The provider's Music terms restrict some inputs; build requests from the user's broad musical qualities and original writing instead of forwarding reference artist/song names.

Live generation can incur charges. A future app integration should show duration and provider status before the user starts a request. No paid generation call was made during the GitHub-backup preparation.
