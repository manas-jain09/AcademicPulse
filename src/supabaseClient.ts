import { createClient } from '@supabase/supabase-js'

// Try to grab from Vite env vars first, fallback to standard env vars, lastly fallback to raw constants
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://jpxqzqbutqcsbyxklvcd.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpweHF6cWJ1dHFjc2J5eGtsdmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTI2ODksImV4cCI6MjA5MDgyODY4OX0.hPJxb1E2ys0YQPaFQCajE3RmsnDjrMT-jHCnURwePQw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
