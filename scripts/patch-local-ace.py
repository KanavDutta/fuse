"""Apply the core-only checkpoint precheck to the isolated upstream checkout."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent / "data/local-ai/ACE-Step-1.5"
file = root / "acestep/core/generation/handler/init_service_downloads.py"
source = file.read_text(encoding="utf-8")
original = "        if not check_main_model_exists(checkpoint_path):"
replacement = '''        # FUSE local mode loads only these real components; an unused LM is optional.
        core_ready = all(check_model_exists(name, checkpoint_path) for name in
                         (config_path, "vae", "Qwen3-Embedding-0.6B"))
        if not check_main_model_exists(checkpoint_path) and not core_ready:'''
if replacement not in source:
    if source.count(original) != 1:
        raise RuntimeError("Upstream checkpoint precheck changed; review before patching.")
    file.write_text(source.replace(original, replacement), encoding="utf-8")
print("Core-only model precheck ready. No missing-model files are faked.")
