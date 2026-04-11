import { createClient } from '@supabase/supabase-js'

// Supabase credentials fetched from environment variables (set via GitHub Secrets)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
