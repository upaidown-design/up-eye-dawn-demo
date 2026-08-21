#!/usr/bin/env python3
"""Create a conservative, reproducible source-material manifest and copy allowlisted evidence."""
from __future__ import annotations

import csv
import hashlib
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "references" / "source-material"
MANIFEST = ROOT / "references" / "source-material-manifest.csv"
ALLOWED_EXT = {".md", ".txt", ".pdf", ".csv", ".json", ".html", ".py", ".png", ".jpg", ".jpeg", ".mp4", ".mov"}
SENSITIVE_NAMES = {
    "CORREO_WEBMAIL_INSECE_PRO.md",
    "CREDENTIALS_INTEGRATION.md",
    "INSECE_PRO_AGENT_HANDOFF.md",
    "SERVIDOR_PRODUCCION.md",
    "handover_completo.md",
    "sistema_insece_documentacion_tecnica.md",
}

SOURCES = [
    (Path("/Users/chris/Desktop/mastil proyecto/dosier_sentinel_v3"), "sentinel/engineering", "CRITICAL", "UP_EYE_DAWN"),
    (Path("/Users/chris/Desktop/mastil proyecto/entregables_sentinel_v3"), "sentinel/misc", "HIGH", "UP_EYE_DAWN"),
    (Path("/Users/chris/Desktop/Wall-AI-Centinel/Documentacion"), "rover/engineering", "HIGH", "UNKNOWN"),
    (Path("/Users/chris/Desktop/Wall-AI-Centinel/Imagenes"), "rover/imagery", "HIGH", "UNKNOWN"),
    (Path("/Users/chris/Desktop/insece/docs"), "legacy", "MEDIUM", "INSECE"),
    (Path("/Users/chris/Desktop/insece/backend_cloud/landing/img"), "legacy", "MEDIUM", "INSECE"),
]

FIELDS = ["source_id", "original_path", "original_filename", "discovered_at", "file_type", "size", "sha256", "modified_at", "category", "product", "relevance", "ownership", "license", "copied", "destination", "duplicate_of", "status", "notes"]


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def product_for(path: Path) -> str:
    low = str(path).lower()
    if "ndvi" in low: return "NDVI"
    if "mastil" in low or "sentinel" in low: return "SENTINEL_003"
    if "wall" in low or "rover" in low: return "ROVER_001"
    return "LEGACY"


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    rows, seen = [], {}
    for base, category, relevance, ownership in SOURCES:
        if not base.exists():
            continue
        for path in sorted(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in ALLOWED_EXT
                           and not {"node_modules", ".git", "dist", "build", "graphify-out"}.intersection(p.parts)):
            sha = digest(path)
            duplicate = seen.get(sha, "")
            source_id = f"SRC_{len(rows)+1:04d}"
            excluded = path.name in SENSITIVE_NAMES
            copied = not duplicate and not excluded and relevance in {"CRITICAL", "HIGH", "MEDIUM"}
            destination = ""
            relative = path.relative_to(base)
            target = DEST / category / relative
            if copied:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
                destination = str(target.relative_to(ROOT))
                seen[sha] = source_id
            elif excluded and target.exists():
                # Remove only the previously generated controlled copy. The source
                # remains untouched at its original Desktop path.
                target.unlink()
            rows.append({
                "source_id": source_id, "original_path": str(path), "original_filename": path.name,
                "discovered_at": now, "file_type": path.suffix.lower().lstrip("."), "size": path.stat().st_size,
                "sha256": sha, "modified_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                "category": category, "product": product_for(path), "relevance": relevance, "ownership": ownership,
                "license": "REVIEW_REQUIRED", "copied": str(copied).lower(), "destination": destination,
                "duplicate_of": duplicate,
                "status": "UNUSABLE" if excluded else ("DUPLICATE" if duplicate else "REVIEW_REQUIRED"),
                "notes": (
                    "Excluded: potentially sensitive operational or credential content; original retained in place."
                    if excluded else "Conservative allowlist ingestion; original retained in place."
                ),
            })
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader(); writer.writerows(rows)
    print(f"manifest_rows={len(rows)} unique_copied={sum(r['copied']=='true' for r in rows)} duplicates={sum(bool(r['duplicate_of']) for r in rows)}")


if __name__ == "__main__":
    main()
