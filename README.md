# Academic Pulse 🎓

> **An Agentic AI Educational Platform for CBSE Class 10 (2025–26)**

---

## Problem Statement

India's 2+ million CBSE Class 10 students face a deeply fragmented study ecosystem. They rely on static textbooks, generic YouTube videos, and one-size-fits-all coaching — none of which adapt to an individual student's pace, weak areas, or exam timeline.

### Key Gaps

- **No intelligent, curriculum-bound tutoring** that explains *why*, not just *what*
- **No personalized feedback** on handwritten practice answers
- **Passive content consumption** with zero active recall or examination simulation
- **Anxiety-inducing exam prep** with no emotional scaffolding or structured planning
- **Disconnected tools** forcing students to switch between apps for notes, quizzes, and revision

> The result: students study harder, not smarter — and performance suffers.

---

## Proposed Solution

**Academic Pulse** is an agentic AI educational platform purpose-built for CBSE Class 10 (2025–26). It replaces the fragmented study stack with a single, intelligent ecosystem that tutors, evaluates, plans, and engages — all grounded strictly in NCERT curriculum content.

The platform deploys a **multi-agent AI system** where specialized agents handle teaching, answer evaluation, and study planning. A **RAG pipeline** ingests NCERT textbooks and ensures every AI response is traceable to verified curriculum content.

Students can:
- Learn through conversation
- Generate full board exam papers
- Upload handwritten answers for AI evaluation
- Listen to AI-generated audio lessons
- Play procedurally generated games
- Run virtual science experiments

All within **one platform**.

---

## Innovation & Uniqueness

Academic Pulse introduces several capabilities with no precedent in the Indian EdTech market for school-level learners:

### 1. Curriculum-Bounded AI with Zero Hallucination Tolerance
Unlike general LLM chatbots, the platform uses a **strict RAG grounding protocol** — if the retrieved NCERT context doesn't contain the answer, the AI refuses to speculate rather than confabulate. Every response is anchored to the actual syllabus.

### 2. Orchestrated Multi-Agent Pedagogy
A master **Orchestrator agent** classifies intent in real-time and routes queries to the appropriate specialist:
- **Socratic Mentor** — for conceptual learning
- **Evaluator** — for strict answer checking
- **Planner** — for study scheduling

Sequential chaining passes output between agents for complex, multi-part queries, creating a seamless tutoring experience.

### 3. Vision-Powered Handwritten Answer Evaluation
Students photograph their handwritten answers and receive a granular **Performance Matrix** — topic-wise strength classification, section-wise analytics, and question-by-question mark justification — replicating the experience of a human CBSE examiner.

### 4. Multimodal Podcast Engine with Persona Themes
Dense NCERT chapters are transformed into studio-quality audio lessons across **four narrative styles**:
- 📖 Story
- 🎭 Dramatic
- 😄 Fun
- 🔁 Revision

Features speech-optimized scripts and client-side WAV reconstruction — no server-side audio processing required.

### 5. Procedural Game Generation from RAG Context
Games are **not static question banks**. They are generated on-the-fly from live curriculum retrieval, ensuring every session is novel and directly tied to what the student is currently studying.

### 6. Live Voice Tutoring with Curriculum Grounding
A real-time voice session module simulates a face-to-face tutor conversation — with the same RAG context as the text-based mentor, ensuring the voice agent never drifts outside CBSE scope.

---

## Features & Functionalities

Each of the six modules works independently but shares the same **RAG knowledge base** and **user profile**, ensuring continuity across all learning modes.

| Module | Description |
|--------|-------------|
| 🧠 **Conversational Tutor** | Socratic AI mentor grounded in NCERT content for deep conceptual understanding |
| 📝 **Exam Paper Generator** | Full board-style papers generated on demand with CBSE marking schemes |
| ✍️ **Handwritten Answer Evaluator** | Vision AI scores uploaded answer sheets with a detailed Performance Matrix |
| 🎙️ **Audio Lesson Engine** | Chapter-to-podcast conversion across Story, Dramatic, Fun, and Revision modes |
| 🎮 **Procedural Game Engine** | Curriculum-linked games generated fresh every session via RAG retrieval |
| 🔬 **Virtual Lab** | Interactive science experiment simulations tied to the CBSE syllabus |

### The Planner Agent
A seventh dimension added by the **Planner Agent** — it interviews students about their available time and target subjects before generating a personalized, day-by-day revision schedule. It **refuses to guess** without complete inputs, ensuring plans are always realistic and student-specific.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Academic Pulse Platform               │
├─────────────────────────────────────────────────────────┤
│  User Interface (Web / Mobile)                          │
├─────────────────────────────────────────────────────────┤
│  RAG Pipeline                                           │
│  └── NCERT Textbook Knowledge Base (Class 10, 2025–26) │
├─────────────────────────────────────────────────────────┤
│  Modules                                                │
│  ├── Exam Paper Generator                               │
│  ├── Handwritten Answer Evaluator (Vision AI)           │
│  ├── Audio/Podcast Engine                               │
│  ├── Procedural Game Generator                          │
│  └── Virtual Science Lab                               │
└─────────────────────────────────────────────────────────┘
```

---

## Target Audience

- **Primary:** CBSE Class 10 students (India), academic year 2025–26
- **Secondary:** Parents seeking structured, accountable learning tools
- **Tertiary:** Schools and coaching centres looking for AI-augmented supplementary instruction

---

## Why Academic Pulse?

| Traditional Tools | Academic Pulse |
|-------------------|----------------|
| Static textbooks | Dynamic, conversational NCERT-grounded AI |
| Generic YouTube videos | Personalized audio lessons with 4 persona modes |
| One-size-fits-all coaching | Adaptive multi-agent tutoring system |
| Manual answer checking | Vision AI with CBSE-style Performance Matrix |
| Separate apps for each need | Single integrated platform |
| Fixed question banks | Procedurally generated, always-novel content |


