# Academic Pulse - Technical Architecture & Algorithmic Expertise

This document outlines the core technical implementations, artificial intelligence methodologies, and algorithmic pipelines used to power the platform's features. The architecture is primarily built using standard web technologies, integrated tightly with Supabase (Edge Functions, Postgres Vector DB), and powered multimodally by the Google GenAI SDK (Gemini Models).

## 1. Retrieval-Augmented Generation (RAG) Pipeline

The RAG pipeline grounds the AI securely inside the CBSE Class 10 curriculum, removing hallucinations and tying facts to specific PDF coordinates and figures.

### Core Architecture
- **Data Ingestion (`build-embeddings.mjs`)**: 
  - Parses raw chapter PDFs using `pdfjs-dist` to extract pure text and regex-patterned figure captions.
  - Applies a sliding-window chunking algorithm: **500 character limits with 100 character overlaps** to maintain semantic continuity between page breaks.
  - Batches text processing dynamically and pipes it into the `text-embedding-004` model to convert strings into high-dimensional vector embeddings.
  - Compiles the payload, linking explicit page metadata and image URIs to each chunk.

### Retrieval Mechanism (`rag.ts`)
- **Semantic Search**: Uses Gemini's `gemini-embedding-2-preview` to embed user queries instantly on the client or middle layer.
- **Database similarity**: Connects to Supabase's `pgvector` via the `match_chapter_chunks` RPC. Uses the **Cosine Similarity metric** to calculate vector distances, pulling the top-K matches based on the highest dot products.
- **Robust Fallbacks**: Should network faults interrupt the RPC, the application shifts computation client-side. The codebase computes raw `O(N)` dot-product comparisons dynamically on cached arrays to ensure 100% uptime when navigating chapters.

---

## 2. Dynamic Games Hub

The games hub transforms dense educational chunks into gamified interactions entirely in real-time, eliminating the need for rigid databases of hard-coded questions.

### Algorithmic Approach (`games.ts`)
- **Context Injection**: Leverages the RAG pipeline to pull the top 8 to 15 relevant chunks of a selected syllabus topic.
- **Procedural Generation**: Utilizes zero-shot prompt engineering against the `gemini-3-flash-preview` model. 
- **Game Modes**:
  - **Memory Sprint**: Extracts deterministic, 2-sentence facts, stripping away surrounding context, and maps them to robust multiple-class distractors.
  - **Case Cracker**: Prompts the AI to transpose rote facts into realistic real-world scenarios requiring associative reasoning instead of raw recall.
  - **Build the Answer**: Validates chronological parsing. Synthesizes process models (e.g., electrolytic refining steps) and applies a Fisher-Yates shuffle array algorithm client-side to randomize rendering.
- **Data Structuring**: The LLM output is heavily constrained and formatted sequentially to strict JSON shapes explicitly typed via TypeScript interfaces to prevent parsing errors.

---

## 3. Audio Overview (Podcast Engine)

Generates studio-quality, persona-driven interactive audio lessons dynamically formatted by content.

### Flow (`audioOverview.ts`)
- **Topic Extraction**: For localized audio (e.g., "Tell me about Corrosion"), the engine re-uses the RAG similarity index to isolate contexts explicitly relating to the user's subset to maintain narrative pacing.
- **Persona Scripting**: 
  - Employs behavioral prompt injections altering the AI's internal response matrix: "storyteller" mode forces high sensory language; "revision" mode forces maximum data density and minimal transition phrasing.
  - Optimizes outputs to strictly remove Markdown, bullets, or structural tokens that TTS parsers misinterpret.
- **Voice Synthesis (`gemini-2.5-flash-preview-tts`)**: 
  - Streams the script payload into Gemini's multi-modal TTS endpoint, requesting base64 audio components formatted to predefined `prebuiltVoiceConfig`s (e.g., 'Kore' for English, 'Puck' for Hindi).
- **Client Conversion Pipeline**: Reconstructs the base64 output via `atob`, populating a tightly-packed `DataView` with a valid 44-byte RIFF/WAVE header mapping dynamic Sample Rates and block alignments logic directly on the client, finalizing a zero-latency `Blob` URL.

---

## 4. Multi-Agent AI Mentor

A sophisticated agentic sub-system bridging conversational state variables into intelligent multi-faceted workflows.

### Orchestrator-Worker Architecture (`mentorAgents.ts`)
- **Orchestrator Agent**:
  - Analyzes user context and chat history buffer.
  - Outputs a strict JSON classification indicating `intent` and a deterministic routing mapping (`agents: ['Evaluator', 'Mentor']`).
- **Worker Agents**:
  - **Mentor**: Focuses strictly on conceptual abstraction and Socratic learning methodologies. Follows stringent constraint parameters to prevent "text-walls."
  - **Planner**: Engages via dependency injection. Detects missing temporal properties required for study plans (e.g., missing "hours available") and suspends generation until iterative queries resolve the inputs.
  - **Evaluator**: Enforces structured feedback mapping against implicit CBSE benchmarks.
- **Algorithmic Routing**: When `intent` invokes multiple agents, the system chains execution contextually. The output of the Evaluator serves as real-time context ingestion for the Mentor, layering advice dynamically without fragmenting conversation logic.

---

## 5. AI Notebook Chat

A focused contextual playground integrating textbook ingestion and generative memory.

### Working Mechanics (`gemini.ts`)
- **Strict Grounding Protocol**: 
  - Prepended system prompts instruct the LLM to forcefully deny out-of-bounds queries ("I'm sorry, I couldn't find information...").
- **Asset Injection**: Formulates a tokenized bridge: `[FIGURE:X.X]`. The AI intelligently determines associative value from matched internal data indices, outputting token macros that the client intercepts. The client replaces these tokens with valid DOM nodes displaying charts or formulas. 
- **Streaming Pipeline**: Uses native Async Iterators to stream the response chunks (`generateContentStream`), updating frontend states immediately and reducing latency for complex pedagogical expansions.

---

## 6. Board Paper Generation

Simulates complex academic evaluation environments leveraging Supabase Edge computing.

### System Methodology (`boardPapers.ts`)
- **Generative Blueprint**: Triggers asynchronous Supabase Edge functions (`/functions/v1/generate-paper`) passing complexity vectors (`difficulty: "medium"`, temporal attributes). The AI computes section constraints (MCQ, Case Study, Long Answer) to establish proportional mark hierarchies.
- **Syntactic Parsing**: The resulting complex, multi-layered JSON (Or alternatives, passage inclusions, sub-questions) is recursively mapped through recursive client-side iteration functions mapping nodes to Semantic HTML DOM elements.
- **Evaluation Engine**: 
  - Accepts User Uploads via Cloud Storage logic (Supabase buckets). 
  - Dispatches an evaluation sequence invoking Gemini Multi-modal capabilities to map OCR inputs against intended rubrics, returning calculated partial scores.
  - Renders granular analytic payloads: mapping 'topic-wise efficiency metrics' to render interactive percentage progressions securely.
