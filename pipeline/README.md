# PDF Question Extraction Pipeline

This project batch-processes exam PDFs into two JSON layers:

- `output/raw/*.json`: page-level text, tables, OCR usage, and extracted image paths
- `output/structured/*.json`: question-wise JSON ready for admin review or database import

Default input folder:

`D:\PW - IBPS SO Prelims Batch + Test series (Video course)\New folder\English dpp`

The pipeline lives inside the main repo at `server/pipeline/`, so its outputs stay alongside the app and the export step can write into `server/test-series/backend/data/`.

## What It Does

- Extracts digital text with PyMuPDF
- Falls back to Tesseract OCR when a page has very little text
- Extracts tables with `pdfplumber` into structured `headers` and `rows`
- Extracts embedded images and links them into question JSON via `image_ref`
- Merges page content before parsing so broken cross-page questions survive better
- Splits question blocks using numbering patterns such as `Q1.` or `1.`
- Detects options `A` to `D`, answer keys, and explanations when present
- Deduplicates repeated questions using normalized question text

## Install

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tesseract OCR must also be installed and available on `PATH`.

## Run

```powershell
python pipeline.py
```

To process a single PDF or a different folder:

```powershell
python pipeline.py --input "D:\path\to\file_or_folder"
```

Export normalized data into the backend folder:

```powershell
python export_to_backend.py --pipeline-output output --backend-data-dir "..\test-series\backend\data"
```

## Output Shape

Structured output follows this shape:

```json
[
  {
    "question_number": "1",
    "question": "Question text",
    "question_html": "Question <b>text</b>",
    "options": [
      {"id": "A", "text": "Option A", "html": "Option <b>A</b>"},
      {"id": "B", "text": "Option B", "html": "Option <b>B</b>"}
    ],
    "correct_answer": "A",
    "explanation": "Explanation text",
    "explanation_html": "Explanation <b>text</b>",
    "tables": [],
    "image_ref": "output/images/example/example_p001_img01.png",
    "tags": ["inequality", "coded"],
    "source_pages": [1, 2]
  }
]
```

Raw page payload now also includes an HTML representation of each page under `pages[].html`, which preserves bold styling and line breaks for web rendering.

## Recommended Next Step

Use the structured JSON as the admin review input. If you want LLM-based cleanup after extraction, feed each raw question block plus linked table/image metadata into your review model and keep human approval as the final gate.
