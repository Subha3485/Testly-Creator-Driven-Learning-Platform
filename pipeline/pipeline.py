from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from html import escape
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence, Tuple

if TYPE_CHECKING:
    import fitz
    import pdfplumber
    from PIL import Image


QUESTION_SPLIT_PATTERN = re.compile(
    r"(?m)(?=^(?:Q(?:uestion)?\s*\d+[\).\:-]?|\d+[\).\:-])\s+)"
)
OPTION_PATTERN = re.compile(
    r"(?m)^\s*(?:\(?([A-E])\)|([A-E])[\).\:-])\s+(.*?)(?=(?:\n\s*(?:\(?[A-E]\)|[A-E][\).\:-])\s+)|\Z)",
    re.DOTALL,
)
ANSWER_PATTERN = re.compile(
    r"(?im)^\s*(?:answer|correct answer|ans(?:wer)?)[\s:.-]*([A-E])\b"
)
EXPLANATION_PATTERN = re.compile(
    r"(?is)(?:^|\n)\s*(?:explanation|solution)[\s:.-]*(.+)$"
)
ANSWER_KEY_ENTRY_PATTERN = re.compile(r"(?im)\bQ(?:uestion)?\s*(\d+)\s*\(?([A-E])\)?")
SOLUTION_SECTION_PATTERN = re.compile(
    r"(?is)Q(?:uestion)?\s*(\d+)\s*(?:\n| )+Text Solution:\s*(.*?)(?=\nQ(?:uestion)?\s*\d+\s*(?:\n| )+Text Solution:|\Z)"
)
QUESTION_LEAD_PATTERN = re.compile(
    r"^\s*(?:Q(?:uestion)?\s*(\d+)|(\d+))[\).\:-]?\s*(.*)$", re.DOTALL
)
LEVEL_PATTERN = re.compile(r"(?im)\bLevel\s*[-–]?\s*(\d+)\b")
NON_WORD_PATTERN = re.compile(r"[^a-z0-9]+")
IGNORED_IMAGE_HASHES = {
    "1ed925fb81925f4343baec661a8f6934",
    "5635860e00d1e9aa3fa674e6ad6352fc",
}
NOISE_LINE_PATTERNS = [
    re.compile(r"^\s*banking\s*$", re.IGNORECASE),
    re.compile(r"^\s*android app\s*$", re.IGNORECASE),
    re.compile(r"^\s*ios app\s*$", re.IGNORECASE),
    re.compile(r"^\s*pw website\s*$", re.IGNORECASE),
    re.compile(r"^\s*mathematical inequalities\s*$", re.IGNORECASE),
    re.compile(r"^\s*\|\s*$"),
]


@dataclass
class PageExtraction:
    page_number: int
    text: str
    html: str
    runs: List[Dict[str, str]]
    used_ocr: bool
    level: str
    tables: List[Dict[str, Any]]
    images: List[str]


def slugify(value: str) -> str:
    normalized = NON_WORD_PATTERN.sub("_", value.lower()).strip("_")
    return normalized or "document"


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def strip_noise_lines(value: str) -> str:
    cleaned_lines = []
    for line in value.splitlines():
        if any(pattern.match(line.strip()) for pattern in NOISE_LINE_PATTERNS):
            continue
        cleaned_lines.append(line)
    return clean_text("\n".join(cleaned_lines))


def is_bold_font(font_name: str) -> bool:
    lower = font_name.lower()
    return bool(re.search(r"\b(?:bold|black|demi|semi|heavy|medium)\b", lower))


def preserve_html_spaces(value: str) -> str:
    # preserve runs of spaces for HTML rendering while leaving single spaces normal
    escaped = escape(value).replace("\t", " ")
    return re.sub(r" {2,}", lambda m: "&nbsp;" * (len(m.group(0)) - 1) + " ", escaped)


def span_to_html(span_text: str, font_name: str) -> str:
    html = preserve_html_spaces(span_text)
    if not html:
        return ""
    if is_bold_font(font_name):
        return f"<b>{html}</b>"
    return html


def build_runs_from_plain_text(text: str) -> Tuple[str, str, List[Dict[str, str]]]:
    runs: List[Dict[str, str]] = []
    for line in text.splitlines(True):
        if line.endswith("\n"):
            line_text = line[:-1]
            if line_text:
                runs.append({"plain": line_text, "html": preserve_html_spaces(line_text)})
            runs.append({"plain": "\n", "html": "<br/>"})
        else:
            runs.append({"plain": line, "html": preserve_html_spaces(line)})
    html = "".join(run["html"] for run in runs)
    return text, html, runs


def build_text_runs_from_page(page: "fitz.Page") -> Tuple[str, str, List[Dict[str, str]]]:
    page_dict = page.get_text("dict")
    runs: List[Dict[str, str]] = []

    for block in page_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        block_has_content = False
        for line in block.get("lines", []):
            line_text = "".join(span.get("text", "") for span in line.get("spans", [])).rstrip("\n")
            if not line_text.strip() or any(pattern.match(line_text.strip()) for pattern in NOISE_LINE_PATTERNS):
                continue
            block_has_content = True
            for span in line.get("spans", []):
                span_text = span.get("text", "")
                if not span_text:
                    continue
                runs.append({"plain": span_text, "html": span_to_html(span_text, span.get("font", ""))})
            runs.append({"plain": "\n", "html": "<br/>"})
        if block_has_content:
            runs.append({"plain": "\n", "html": "<br/>"})

    while runs and runs[-1]["plain"] == "\n":
        runs.pop()

    if not runs:
        return build_runs_from_plain_text(strip_noise_lines(page.get_text("text")))

    plain = "".join(run["plain"] for run in runs)
    html = "".join(run["html"] for run in runs)
    return plain, html, runs


def extract_text_from_page(page: "fitz.Page", ocr_threshold: int = 40) -> Tuple[str, str, List[Dict[str, str]], bool]:
    import pytesseract

    text, html, runs = build_text_runs_from_page(page)
    if len(text) >= ocr_threshold:
        return text, html, runs, False

    image = render_page_for_ocr(page)
    try:
        ocr_text = strip_noise_lines(pytesseract.image_to_string(image))
    except pytesseract.TesseractNotFoundError:
        return text, html, runs, False

    if len(ocr_text) > len(text):
        _, ocr_html, ocr_runs = build_runs_from_plain_text(ocr_text)
        return ocr_text, ocr_html, ocr_runs, True
    return text, html, runs, False


def html_from_plain_span(runs: Sequence[Dict[str, str]], start: int, end: int) -> str:
    html_parts: List[str] = []
    offset = 0
    for run in runs:
        run_plain = run["plain"]
        run_len = len(run_plain)
        if offset + run_len <= start:
            offset += run_len
            continue
        if offset >= end:
            break
        local_start = max(0, start - offset)
        local_end = min(run_len, end - offset)
        fragment = run_plain[local_start:local_end]
        if run_plain == "\n":
            html_parts.append("<br/>")
        else:
            if run["html"].startswith("<b>") and run["html"].endswith("</b>"):
                html_parts.append(f"<b>{preserve_html_spaces(fragment)}</b>")
            else:
                html_parts.append(preserve_html_spaces(fragment))
        offset += run_len
    return "".join(html_parts)


def split_question_blocks(full_text: str) -> List[Tuple[str, int, int]]:
    starts = [match.start() for match in QUESTION_SPLIT_PATTERN.finditer(full_text)]
    if not starts:
        return []
    blocks: List[Tuple[str, int, int]] = []
    starts.append(len(full_text))
    for index in range(len(starts) - 1):
        start, end = starts[index], starts[index + 1]
        chunk = full_text[start:end]
        if QUESTION_LEAD_PATTERN.match(chunk):
            blocks.append((chunk, start, end))
    return blocks


def extract_options(block: str) -> Tuple[str, List[Dict[str, Any]], int]:
    matches = list(OPTION_PATTERN.finditer(block))
    if not matches:
        return clean_text(block), [], len(block)

    question_text = clean_text(block[: matches[0].start()])
    options: List[Dict[str, Any]] = []
    for match in matches:
        option_id = match.group(1) or match.group(2)
        option_text = clean_text(match.group(3))
        options.append(
            {
                "id": option_id,
                "text": option_text,
                "raw_start": match.start(3),
                "raw_end": match.end(3),
            }
        )
    return question_text, options, matches[0].start()


def extract_answer_and_explanation(block: str) -> Tuple[str, str, Optional[int], Optional[int]]:
    answer_match = ANSWER_PATTERN.search(block)
    explanation_match = EXPLANATION_PATTERN.search(block)
    answer = answer_match.group(1).strip() if answer_match else ""
    explanation = clean_text(explanation_match.group(1)) if explanation_match else ""
    explanation_start = explanation_match.start(1) if explanation_match else None
    explanation_end = explanation_match.end(1) if explanation_match else None
    return answer, explanation, explanation_start, explanation_end


def collect_page_assets(page: PageExtraction) -> Tuple[List[Dict[str, Any]], str]:
    image_ref = page.images[0] if page.images else ""
    return list(page.tables), image_ref


def normalize_level(value: str) -> str:
    match = LEVEL_PATTERN.search(value)
    if not match:
        return ""
    return f"Level-{match.group(1)}"


def normalize_table(raw_table: Sequence[Sequence[Optional[str]]]) -> Dict[str, Any]:
    rows = [[clean_text(cell or "") for cell in row] for row in raw_table if any(cell for cell in row)]
    if not rows:
        return {"headers": [], "rows": []}
    headers = rows[0]
    body = rows[1:] if len(rows) > 1 else []
    return {"headers": headers, "rows": body}


def render_page_for_ocr(page: fitz.Page, dpi: int = 200) -> Image.Image:
    import fitz
    from PIL import Image

    matrix = fitz.Matrix(dpi / 72, dpi / 72)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    return Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)


def extract_text_from_page(page: fitz.Page, ocr_threshold: int = 40) -> Tuple[str, bool]:
    import pytesseract

    text = strip_noise_lines(page.get_text("text"))
    if len(text) >= ocr_threshold:
        return text, False

    image = render_page_for_ocr(page)
    try:
        ocr_text = strip_noise_lines(pytesseract.image_to_string(image))
    except pytesseract.TesseractNotFoundError:
        return text, False
    if len(ocr_text) > len(text):
        return ocr_text, True
    return text, False


def extract_images(doc: fitz.Document, pdf_name: str, image_dir: Path) -> Dict[int, List[str]]:
    page_images: Dict[int, List[str]] = {}
    safe_name = slugify(pdf_name)
    image_dir.mkdir(parents=True, exist_ok=True)

    for page_index in range(len(doc)):
        page = doc[page_index]
        refs: List[str] = []
        for image_index, image_meta in enumerate(page.get_images(full=True), start=1):
            xref = image_meta[0]
            image_data = doc.extract_image(xref)
            image_hash = hashlib.md5(image_data["image"]).hexdigest()
            if image_hash in IGNORED_IMAGE_HASHES:
                continue
            extension = image_data.get("ext", "png")
            filename = f"{safe_name}_p{page_index + 1:03d}_img{image_index:02d}.{extension}"
            output_path = image_dir / filename
            output_path.write_bytes(image_data["image"])
            refs.append(str(output_path))
        page_images[page_index + 1] = refs

    return page_images


def extract_tables(pdf_path: Path) -> Dict[int, List[Dict[str, Any]]]:
    import pdfplumber

    page_tables: Dict[int, List[Dict[str, Any]]] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            extracted = []
            for table in page.extract_tables() or []:
                normalized = normalize_table(table)
                if normalized["headers"] or normalized["rows"]:
                    extracted.append(normalized)
            page_tables[page_index] = extracted
    return page_tables


def extract_pdf_content(pdf_path: Path, image_dir: Path) -> List[PageExtraction]:
    import fitz

    doc = fitz.open(pdf_path)
    page_tables = extract_tables(pdf_path)
    page_images = extract_images(doc, pdf_path.stem, image_dir)
    pages: List[PageExtraction] = []
    current_level = ""

    for page_number in range(1, len(doc) + 1):
        page = doc[page_number - 1]
        raw_text = clean_text(page.get_text("text"))
        current_level = normalize_level(raw_text) or current_level
        text, html, runs, used_ocr = extract_text_from_page(page)
        pages.append(
            PageExtraction(
                page_number=page_number,
                text=text,
                html=html,
                runs=runs,
                used_ocr=used_ocr,
                level=current_level,
                tables=page_tables.get(page_number, []),
                images=page_images.get(page_number, []),
            )
        )

    doc.close()
    return pages


def merge_pages(pages: Sequence[PageExtraction]) -> str:
    merged_parts = []
    for page in pages:
        page_header = f"\n[PAGE {page.page_number}]\n"
        merged_parts.append(page_header + page.text)
    return clean_text("\n".join(merged_parts))


def extract_question_number(block: str) -> Optional[str]:
    match = QUESTION_LEAD_PATTERN.match(block)
    if not match:
        return None
    number = match.group(1) or match.group(2)
    return number.strip() if number else None


def strip_question_lead(block: str) -> str:
    match = QUESTION_LEAD_PATTERN.match(block)
    if not match:
        return block.strip()
    return clean_text(match.group(3) or "")


def collect_page_assets(page: PageExtraction) -> Tuple[List[Dict[str, Any]], str]:
    image_ref = page.images[0] if page.images else ""
    return list(page.tables), image_ref


def extract_answer_key_map(pages: Sequence[PageExtraction]) -> Dict[Tuple[str, str], str]:
    answer_map: Dict[Tuple[str, str], str] = {}
    for page in pages:
        if "answer key" not in page.text.lower():
            continue
        for question_number, answer in ANSWER_KEY_ENTRY_PATTERN.findall(page.text):
            answer_map[(page.level, question_number)] = answer
    return answer_map


def extract_solution_map(pages: Sequence[PageExtraction]) -> Dict[Tuple[str, str], Dict[str, str]]:
    solution_map: Dict[Tuple[str, str], Dict[str, str]] = {}
    for page in pages:
        if "text solution" not in page.text.lower():
            continue
        for question_number, solution_body in SOLUTION_SECTION_PATTERN.findall(page.text):
            answer, explanation = extract_answer_and_explanation(clean_text(solution_body))
            solution_map[(page.level, question_number)] = {
                "correct_answer": answer,
                "explanation": explanation or clean_text(solution_body),
            }
    return solution_map


def parse_questions(pages: Sequence[PageExtraction], source_pdf: Path) -> List[Dict[str, Any]]:
    default_tags = build_tags(source_pdf)
    answer_key_map = extract_answer_key_map(pages)
    solution_map = extract_solution_map(pages)
    questions: List[Dict[str, Any]] = []

    for page in pages:
        page_text_lower = page.text.lower()
        if "answer key" in page_text_lower or "text solution" in page_text_lower:
            continue

        for block, block_start, _ in split_question_blocks(page.text):
            answer, explanation, explanation_start, explanation_end = extract_answer_and_explanation(block)
            question_number = extract_question_number(block)

            lead_match = QUESTION_LEAD_PATTERN.match(block)
            body_offset = lead_match.start(3) if lead_match else 0
            body_block = block[body_offset:]
            question_text, options, question_body_end = extract_options(body_block)
            absolute_body_start = block_start + body_offset
            question_html = html_from_plain_span(
                page.runs,
                absolute_body_start,
                absolute_body_start + question_body_end,
            )

            for option in options:
                option_html = html_from_plain_span(
                    page.runs,
                    absolute_body_start + option["raw_start"],
                    absolute_body_start + option["raw_end"],
                )
                option["html"] = option_html
                option.pop("raw_start", None)
                option.pop("raw_end", None)

            explanation_html = ""
            if explanation and explanation_start is not None and explanation_end is not None:
                explanation_html = html_from_plain_span(
                    page.runs,
                    block_start + explanation_start,
                    block_start + explanation_end,
                )

            tables, image_ref = collect_page_assets(page)
            level = page.level
            solved = solution_map.get((level, question_number or ""), {})

            questions.append(
                {
                    "question_number": question_number,
                    "level": level,
                    "question": question_text,
                    "question_html": question_html,
                    "options": options,
                    "correct_answer": answer
                    or solved.get("correct_answer", "")
                    or answer_key_map.get((level, question_number or ""), ""),
                    "explanation": explanation or solved.get("explanation", ""),
                    "explanation_html": explanation_html or solved.get("explanation", ""),
                    "tables": tables,
                    "image_ref": image_ref,
                    "tags": default_tags,
                    "source_pages": [page.page_number],
                }
            )

    return deduplicate_questions(questions)


def deduplicate_questions(questions: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique: List[Dict[str, Any]] = []
    for question in questions:
        key = clean_text(question["question"]).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(question)
    return unique


def build_raw_payload(pdf_path: Path, pages: Sequence[PageExtraction]) -> Dict[str, Any]:
    return {
        "source_pdf": str(pdf_path),
        "pages": [
            {
                "page_number": page.page_number,
                "used_ocr": page.used_ocr,
                "level": page.level,
                "text": page.text,
                "html": page.html,
                "tables": page.tables,
                "images": page.images,
            }
            for page in pages
        ],
    }


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def process_pdf(pdf_path: Path, output_dir: Path) -> Dict[str, Any]:
    pdf_slug = slugify(pdf_path.stem)
    image_dir = output_dir / "images" / pdf_slug
    raw_path = output_dir / "raw" / f"{pdf_slug}.json"
    structured_path = output_dir / "structured" / f"{pdf_slug}.json"

    pages = extract_pdf_content(pdf_path, image_dir)
    raw_payload = build_raw_payload(pdf_path, pages)
    structured_payload = parse_questions(pages, pdf_path)

    save_json(raw_path, raw_payload)
    save_json(structured_path, structured_payload)

    return {
        "pdf": str(pdf_path),
        "raw_output": str(raw_path),
        "structured_output": str(structured_path),
        "question_count": len(structured_payload),
        "ocr_pages": sum(1 for page in pages if page.used_ocr),
    }


def find_pdfs(input_path: Path) -> List[Path]:
    if input_path.is_file() and input_path.suffix.lower() == ".pdf":
        return [input_path]
    return sorted(path for path in input_path.rglob("*.pdf") if path.is_file())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract questions, tables, and images from exam PDFs into JSON."
    )
    parser.add_argument(
        "--input",
        default=r"D:\PW - IBPS SO Prelims Batch + Test series (Video course)\New folder\English dpp",
        help="PDF file or directory to process.",
    )
    parser.add_argument(
        "--output",
        default="output",
        help="Directory where extracted JSON and images will be written.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    try:
        import fitz  # noqa: F401
        import pdfplumber  # noqa: F401
        import pytesseract  # noqa: F401
        from PIL import Image  # noqa: F401
    except ModuleNotFoundError as error:
        missing_module = error.name or "dependency"
        raise SystemExit(
            f"Missing dependency: {missing_module}. Install requirements with "
            f"`pip install -r requirements.txt` before running the pipeline."
        ) from error

    input_path = Path(args.input)
    output_dir = Path(args.output)
    pdfs = find_pdfs(input_path)

    if not pdfs:
        raise FileNotFoundError(f"No PDF files found in {input_path}")

    summary = [process_pdf(pdf_path, output_dir) for pdf_path in pdfs]
    save_json(output_dir / "summary.json", summary)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
