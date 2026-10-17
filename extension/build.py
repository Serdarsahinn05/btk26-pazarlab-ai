"""Package the extension.

    python extension/build.py         # dist/pazarlab-extension-<version>.zip, for the Chrome Web Store
    python extension/build.py --dev   # dist/dev/, the same extension pointed at localhost (load unpacked)
"""
import json
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
# Only what the browser runs; docs, store assets and this script stay out of the package.
FILES = ["manifest.json", "popup.html", "popup.css", "popup.js", "config.js", "handoff.js", "snapshot.js",
         "icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png", "icons/icon-128.png"]

PROD_SITE, PROD_API = "https://pazarlab-ai.vercel.app", "https://pazarlab-api.onrender.com"
DEV_SITE, DEV_API = "http://localhost:3000", "http://localhost:8000"


def check_config() -> dict:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    config = (ROOT / "config.js").read_text(encoding="utf-8")
    assert f'"{PROD_SITE}"' in config and f'"{PROD_API}"' in config, "config.js must hold the production addresses"
    assert manifest["host_permissions"] == [f"{PROD_API}/*"], "host_permissions must be the production API only"
    return manifest


def build_store(manifest: dict) -> Path:
    DIST.mkdir(exist_ok=True)
    target = DIST / f"pazarlab-extension-{manifest['version']}.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in FILES:
            zf.write(ROOT / name, name)
    return target


def build_dev(manifest: dict) -> Path:
    target = DIST / "dev"
    if target.exists():
        shutil.rmtree(target)
    for name in FILES:
        (target / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target / name)
    config = (target / "config.js").read_text(encoding="utf-8")
    (target / "config.js").write_text(config.replace(PROD_SITE, DEV_SITE).replace(PROD_API, DEV_API), encoding="utf-8")
    dev = {**manifest, "name": manifest["name"] + " (yerel)", "host_permissions": [f"{DEV_API}/*", "http://127.0.0.1:8000/*"]}
    (target / "manifest.json").write_text(json.dumps(dev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target


if __name__ == "__main__":
    manifest = check_config()
    out = build_dev(manifest) if "--dev" in sys.argv else build_store(manifest)
    print(out)
