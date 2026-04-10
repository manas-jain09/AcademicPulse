#!/usr/bin/env python3
import json
import os
import re
import sys
import time
from pathlib import Path

from google import genai
from pypdf import PdfReader


CHUNK_SIZE = 500
OVERLAP = 100
EMBEDDINGS_CACHE_VERSION = 1
EMBED_MODEL = "gemini-embedding-2-preview"


def load_dotenv(project_root: Path) -> None:
    env_path = project_root / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def safe_name(file_name: str) -> str:
    stem = re.sub(r"\.pdf$", "", file_name, flags=re.IGNORECASE)
    return re.sub(r"[^a-zA-Z0-9_-]", "_", stem)


def extract_content_from_pdf(pdf_path: Path):
    reader = PdfReader(str(pdf_path))
    pages = []
    page_figures = {}
    figure_registry = {}
    figure_caption_regex = re.compile(r"(?:Figure|Fig\.?)\s*(\d+\.\d+)(.*?)(?=$|\n)", re.IGNORECASE)

    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(text)
        page_figures[idx] = []

        for match in figure_caption_regex.finditer(text):
            fig_num = match.group(1)
            fig_label = f"fig_{fig_num.replace('.', '_')}"
            basic_caption = (match.group(2) or "").strip() or f"Figure {fig_num}"
            fig_info = {
                "label": match.group(0).strip(),
                "url": f"/img/{fig_num}.png",
                "page": idx,
                "caption": basic_caption,
            }
            if not any(f["label"] == fig_info["label"] for f in page_figures[idx]):
                page_figures[idx].append(fig_info)
                figure_registry[fig_label] = fig_info

    return pages, page_figures, figure_registry


def chunk_page_text(text: str, page_num: int, figures):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append({"text": chunk, "page": page_num, "figures": figures})
        start += CHUNK_SIZE - OVERLAP
    return chunks


def embed_text(client: genai.Client, text: str):
    response = client.models.embed_content(
        model=EMBED_MODEL,
        contents=text,
        config={"task_type": "RETRIEVAL_DOCUMENT"},
    )
    if not response.embeddings:
        return []
    return response.embeddings[0].values or []


def main():
    project_root = Path.cwd()
    load_dotenv(project_root)

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in environment or .env")

    source_arg = sys.argv[1] if len(sys.argv) > 1 else "ScienceChapter3.pdf"
    pdf_path = (project_root / source_arg).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"Reading PDF: {pdf_path}")
    pages, page_figures, figure_registry = extract_content_from_pdf(pdf_path)

    all_chunks = []
    for i, page_text in enumerate(pages, start=1):
        all_chunks.extend(chunk_page_text(page_text, i, page_figures.get(i, [])))

    print(f"Embedding {len(all_chunks)} chunks...")
    client = genai.Client(api_key=api_key)
    output_chunks = []
    for idx, chunk in enumerate(all_chunks, start=1):
        vec = embed_text(client, chunk["text"])
        output_chunks.append(
            {
                "text": chunk["text"],
                "embedding": vec,
                "page": chunk["page"],
                "figures": chunk["figures"],
            }
        )
        if idx % 5 == 0 or idx == len(all_chunks):
            print(f"Embedded {idx}/{len(all_chunks)}")
        # Soft throttle for API friendliness
        time.sleep(0.05)

    output_dir = project_root / "public" / "embeddings"
    output_dir.mkdir(parents=True, exist_ok=True)
    out_name = f"{safe_name(pdf_path.name)}.embeddings.json"
    out_path = output_dir / out_name

    out = {
        "version": EMBEDDINGS_CACHE_VERSION,
        "sourcePdf": pdf_path.name,
        "chunkSize": CHUNK_SIZE,
        "overlap": OVERLAP,
        "chunks": output_chunks,
        "figureRegistry": figure_registry,
    }
    out_path.write_text(json.dumps(out, ensure_ascii=True), encoding="utf-8")
    print(f"Saved embeddings file: {out_path}")


if __name__ == "__main__":
    main()
