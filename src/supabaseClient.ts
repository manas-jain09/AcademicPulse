import { createClient } from '@supabase/supabase-js'

// Try to grab from Vite env vars first, fallback to standard env vars, lastly fallback to raw constants
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials missing from environment variables.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
