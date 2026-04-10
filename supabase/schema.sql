-- Supabase Schema for Academic Pulse (10th Grade CBSE Board)

-- 1. Extend Default Supabase Users with a Public Profiles Table
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  grade_level INT DEFAULT 10,
  board TEXT DEFAULT 'CBSE',
  avatar_url TEXT,
  target_percentage DECIMAL(5,2), -- Their target board percentage
  is_pro_member BOOLEAN DEFAULT false, -- For AI predictor locks
  total_pulse_points INT DEFAULT 0, -- Total Pulse Points earned across games
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 2. Master Subjects Data
CREATE TABLE public.subjects (
  id TEXT PRIMARY KEY, -- e.g., 'math', 'science', 'sst', 'english', 'hindi'
  title TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  color_hex TEXT
);

-- 3. Master Chapters Data
CREATE TABLE public.chapters (
  id SERIAL PRIMARY KEY,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  tag TEXT, -- e.g., 'History', 'Geography'
  pdf_storage_path TEXT -- Supabase Storage reference to the chapter's PDF file
);

-- Enable pgvector plugin for AI text embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 3.1 Chapter Document Embeddings for RAG
CREATE TABLE public.chapter_document_chunks (
  id BIGSERIAL PRIMARY KEY,
  chapter_id INT REFERENCES public.chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Text content of the chunk
  metadata JSONB, -- Additional info (e.g. page number, location, headers)
  embedding vector(3072) -- Vector embedding for similarity search (3072 dimensions for Gemini text-embedding-004/gemini-embedding-2-preview)
);

-- Note: HNSW index is not created here because pgvector limits HNSW indexing to a maximum of 2000 dimensions.
-- Exact nearest neighbor search will be used dynamically.

-- 4. User Progress / Subject Tracker
-- Tracks exactly which chapter the user is currently studying and their progress
CREATE TABLE public.user_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT REFERENCES public.chapters(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'in_progress',
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);


-- 5. User Exam Papers (Mock Board Papers & School Exams)
CREATE TABLE public.user_papers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id), -- Specifically tracks which subject this paper is for
  paper_name TEXT NOT NULL,
  paper_type TEXT CHECK (paper_type IN ('mock_paper', 'school_exam')) DEFAULT 'mock_paper',
  pdf_storage_path TEXT, -- Supabase Storage reference to the generated question paper (if applicable)
  answer_sheet_storage_path TEXT, -- Supabase Storage reference to user's uploaded answer sheet
  evaluation_results JSONB, -- JSON payload of the AI evaluation results
  score_obtained DECIMAL(5,2),
  total_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 6. AI Chat Sessions Memory
-- Saves conversation states so students can return to their study sessions
CREATE TABLE public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT REFERENCES public.chapters(id) ON DELETE CASCADE,
  session_mode TEXT DEFAULT 'tutoring', -- 'tutoring', 'quiz', 'mindmap'
  message_history JSONB DEFAULT '[]'::jsonb, -- Array of role/content objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 7. Analytics & Quizzes
CREATE TABLE public.quiz_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT REFERENCES public.chapters(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL, -- e.g., 'flashcards', 'mcq', 'viva'
  score INT NOT NULL,
  total_questions INT NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- 8. Game Scores (Pulse Points Tracking)
CREATE TABLE public.game_scores (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL, -- e.g., 'memory', 'case', 'rapid', 'build'
  points INT NOT NULL, -- Pulse Points earned in this game session
  max_streak INT DEFAULT 0,
  accuracy INT DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
