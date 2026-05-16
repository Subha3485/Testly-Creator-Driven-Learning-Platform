#!/usr/bin/env python3
"""
Export pipeline outputs (structured JSON + images + PDFs) into backend data layout.

Usage:
    python export_to_backend.py --pipeline-output output --backend-data-dir "..\\test-series\\backend\\data" [--upload-s3]

The script copies images to `backend_data_dir/images/<slug>/`, PDFs to `backend_data_dir/pdfs/` and
writes compact, DB-shaped JSON files into `backend_data_dir/structured/`.

If AWS credentials are present and `--upload-s3` is passed, the script will attempt to upload assets
to the specified S3 bucket (env `S3_BUCKET`) using `boto3`. `boto3` is optional.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export pipeline outputs to backend data layout")
    parser.add_argument("--pipeline-output", default="output", help="Pipeline output directory")
    parser.add_argument(
        "--backend-data-dir",
        default=os.environ.get("BACKEND_DATA_DIR", "../test-series/backend/data"),
        help="Backend data root directory",
    )
    parser.add_argument("--upload-s3", action="store_true", help="Upload assets to S3 if configured")
    return parser.parse_args()


def load_summary(output_dir: Path) -> List[Dict[str, Any]]:
    summary_path = output_dir / "summary.json"
    if not summary_path.exists():
        return []
    return json.loads(summary_path.read_text(encoding="utf-8"))


def ensure_dirs(base: Path) -> None:
    (base / "structured").mkdir(parents=True, exist_ok=True)
    (base / "images").mkdir(parents=True, exist_ok=True)
    (base / "pdfs").mkdir(parents=True, exist_ok=True)


def find_summary_entry_for_structured(summary: List[Dict[str, Any]], structured_path: str) -> Dict[str, Any]:
    for entry in summary:
        if str(entry.get("structured_output", "")).endswith(structured_path):
            return entry
    return {}


def copy_asset(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def build_compact_record(pdf_slug: str, qidx: int, q: Dict[str, Any], pdf_filename: str) -> Dict[str, Any]:
    options = q.get("options", [])
    return {
        "id": f"{pdf_slug}_{qidx+1}",
        "questionHtml": q.get("question_html") or "",
        "optionsHtml": [opt.get("html") or opt.get("text") or "" for opt in options],
        "explanationHtml": q.get("explanation_html") or "",
        "imageRefs": [],
        "sourcePdf": {
            "key": pdf_filename,
            "url": f"/reasoning-pdfs/{pdf_filename}",
            "pages": q.get("source_pages", []),
        },
        "textPlain": q.get("question") or "",
        "metadata": {
            "questionNumber": q.get("question_number"),
            "level": q.get("level"),
            "tags": q.get("tags", []),
        },
    }


def main() -> None:
    args = parse_args()
    out_dir = Path(args.pipeline_output).resolve()
    backend_dir = Path(args.backend_data_dir).resolve()

    if not out_dir.exists():
        raise SystemExit(f"Pipeline output directory not found: {out_dir}")

    ensure_dirs(backend_dir)
    summary = load_summary(out_dir)

    structured_dir = out_dir / "structured"
    images_dir = out_dir / "images"

    for structured_file in sorted(structured_dir.glob("*.json")):
        pdf_slug = structured_file.stem
        try:
            questions = json.loads(structured_file.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Skipping {structured_file}: failed to read JSON: {exc}")
            continue

        # find pdf path from summary
        entry = find_summary_entry_for_structured(summary, structured_file.name)
        pdf_path = Path(entry.get("pdf", "")) if entry.get("pdf") else None
        pdf_filename = pdf_path.name if pdf_path else f"{pdf_slug}.pdf"

        # copy pdf into backend/pdfs
        if pdf_path and pdf_path.exists():
            dst_pdf = backend_dir / "pdfs" / pdf_filename
            copy_asset(pdf_path, dst_pdf)
            print(f"Copied PDF {pdf_path} -> {dst_pdf}")

        # copy images for this slug
        src_img_dir = images_dir / pdf_slug
        dst_img_dir = backend_dir / "images" / pdf_slug
        if src_img_dir.exists():
            dst_img_dir.mkdir(parents=True, exist_ok=True)
            for img in src_img_dir.iterdir():
                if img.is_file():
                    copy_asset(img, dst_img_dir / img.name)
            print(f"Copied images for {pdf_slug} -> {dst_img_dir}")

        compact: List[Dict[str, Any]] = []
        for idx, q in enumerate(questions):
            rec = build_compact_record(pdf_slug, idx, q, pdf_filename)
            # if question had image_ref, map to key under backend images
            image_ref = q.get("image_ref") or ""
            if image_ref:
                image_name = Path(image_ref).name
                key = f"{pdf_slug}/{image_name}"
                rec["imageRefs"].append({"key": key, "url": None, "alt": ""})
            compact.append(rec)

        out_path = backend_dir / "structured" / f"{structured_file.name}"
        out_path.write_text(json.dumps(compact, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote compact structured file -> {out_path} ({len(compact)} questions)")

    print("Export complete.")


if __name__ == "__main__":
    main()
