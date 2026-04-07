import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[TaskFlow] Missing Supabase env vars.\n' +
    'Local dev: copy .env.example → .env and fill in your keys.\n' +
    'GitHub Pages: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as repo secrets.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
