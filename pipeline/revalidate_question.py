#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys

# Import pipeline functions from pipeline.py located in same folder
try:
    from pipeline import extract_pdf_content, parse_questions, slugify
except Exception:
    # If module import fails when executed as script, import via path
    from importlib import import_module
    pipeline = import_module('pipeline')
    extract_pdf_content = pipeline.extract_pdf_content
    parse_questions = pipeline.parse_questions
    slugify = pipeline.slugify


def main():
    parser = argparse.ArgumentParser(description="Re-validate a single question from a PDF using the pipeline")
    parser.add_argument("--pdf", required=True, help="Path to source PDF")
    parser.add_argument("--index", required=True, type=int, help="0-based question index to extract from the structured list")
    parser.add_argument("--output", help="Optional path to write full structured JSON")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(json.dumps({"error": f"PDF not found: {pdf_path}"}))
        sys.exit(2)

    try:
        pages = extract_pdf_content(pdf_path, pdf_path.parent)
        structured = parse_questions(pages, pdf_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(3)

    if args.output:
        try:
            Path(args.output).write_text(json.dumps(structured, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    idx = int(args.index)
    if idx < 0 or idx >= len(structured):
        print(json.dumps({"error": "index_out_of_range", "length": len(structured)}))
        sys.exit(4)

    q = structured[idx]
    # normalize output to have html keys similar to pipeline: question_html, explanation_html, options with html
    out = {
        "question_html": q.get("question_html") or q.get("question_html") or q.get("questionHtml") or "",
        "explanation_html": q.get("explanation_html") or q.get("explanationHtml") or "",
        "options": [],
        "image_ref": q.get("image_ref") or q.get("imageRef") or "",
        "question": q.get("question") or q.get("question_text") or "",
    }
    opts = q.get("options") or []
    for o in opts:
        out_opt = {"text": o.get("text") if isinstance(o, dict) else str(o), "html": o.get("html") if isinstance(o, dict) else ""}
        out["options"].append(out_opt)

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
