# Local ACE-Step generation

This backend runs on the computer's NVIDIA GPU. It never falls back to ElevenLabs or forwards its API key. Initial setup targets short instrumental clips, batch size 1, with the optional language model disabled. Keep the engine bound to localhost.

## Isolated installation

All downloaded tools, Python environments, models, caches, and benchmark audio live under ignored `data/local-ai/`. They are not part of the GitHub backup. The app's ordinary Node dependencies remain unchanged.

The official source checkout used for this installation is `ace-step/ACE-Step-1.5` at commit `ca1e85fe9430179831e6bc6be790c332190a3866`. Core model revision is recorded privately in `data/local-ai/model-revision.json`. The download helper selects the turbo DiT, VAE, and Qwen embedding model; it excludes the optional 5 Hz language model.

Installation sequence on Windows:

1. Create a Python 3.12 virtual environment at `data/local-ai/bootstrap`; install `uv` and `huggingface_hub` there.
2. Clone https://github.com/ace-step/ACE-Step-1.5 into `data/local-ai/ACE-Step-1.5` and check out the source revision above.
3. Run bootstrap `uv sync --frozen --directory data/local-ai/ACE-Step-1.5 --python <Python-3.12-path>`. Keep its cache under `data/local-ai/uv-cache` if desired.
4. Run `scripts/download-ace-step.py` using the bootstrap Python. This downloads only core components from the official model repository.
5. Run `python scripts/patch-local-ace.py`. The isolated source's startup precheck otherwise requires optional LM weights even in DiT-only mode. The patch verifies that the selected DiT, VAE, and text encoder really exist; it does not create dummy weights.

The source and model are MIT-licensed: https://github.com/ace-step/ACE-Step-1.5 and https://huggingface.co/ACE-Step/Ace-Step1.5. Preserve their notices when redistributing upstream material.

## Start and benchmark

`npm run local:engine` starts the isolated Python API server on `127.0.0.1:8001`. It enables CPU/DiT offloading and tiled decoding, disables optional LM initialization, Flash Attention, and model compilation, and uses already downloaded files offline. It does not change Windows execution policies or driver settings.

Wait for model initialization, then run `npm run local:benchmark` deliberately. This submits one 10-second instrumental task to the local model and saves `data/local-ai/test-output.wav` plus timing/settings in `benchmark.json`. This benchmark is excluded from `npm test`; routine tests use injected responses.

## App connection

After a successful benchmark, set these private `.env` values and restart FUSE:

```dotenv
FUSE_GENERATION_PROVIDER=ace-step
FUSE_LOCAL_ACE_URL=http://127.0.0.1:8001
```

The existing ElevenLabs key may remain in `.env`; this local selection does not use it. Explicitly changing the provider is required to use ElevenLabs again.

Local mode currently accepts instrumentals up to 30 seconds. The app checks model readiness, submits one asynchronous task, polls it, and stores the returned WAV with the generation job. The generated player and download indicate ACE-Step and WAV output. Closing/cancelling the app request stops waiting; the engine's GPU task may continue. Run only one generation at a time on a low-memory laptop.

## Validation status

Validated on October 28, 2026: RTX 5060 Laptop GPU (8 GB), 16 GB system RAM. Standalone 10-second generation completed in 21.01 seconds; FUSE end-to-end generation completed in 22.39 seconds. Output: 48 kHz stereo WAV, exactly 10 seconds. Standalone samples were finite, peak -1 dBFS and RMS -18.22 dBFS. Engine log reported 4.52 GB peak PyTorch GPU allocation (not total VRAM). Browser playback and WAV download succeeded. All 33 automated tests passed. These checks validate operation and file integrity, not subjective musical quality.
