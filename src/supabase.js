import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqxuuswirettloxbeudp.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,       // store session in localStorage
    autoRefreshToken: true,     // silently refresh JWT before expiry
    detectSessionInUrl: false,  // IMPORTANT: we handle Gmail OAuth redirect ourselves
    storageKey: 'lifeops-pro',  // PERMANENT key - never change this
  },
})
