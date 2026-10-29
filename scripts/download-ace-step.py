"""Download only ACE-Step's DiT, VAE, and text encoder (no optional LM)."""
import json
from pathlib import Path
from huggingface_hub import HfApi, snapshot_download

root = Path(__file__).resolve().parent.parent / "data" / "local-ai"
target = root / "ACE-Step-1.5" / "checkpoints"
repo = "ACE-Step/Ace-Step1.5"
revision = HfApi(token=False).model_info(repo).sha
print(f"Downloading core model components at revision {revision}", flush=True)
snapshot_download(
    repo_id=repo,
    revision=revision,
    local_dir=str(target),
    allow_patterns=["acestep-v15-turbo/*", "vae/*", "Qwen3-Embedding-0.6B/*", "LICENSE", "README.md"],
    max_workers=2,
    token=False,
)
(root / "model-revision.json").write_text(json.dumps({"repository": repo, "revision": revision}, indent=2))
print("Core models downloaded; optional language model excluded.", flush=True)
