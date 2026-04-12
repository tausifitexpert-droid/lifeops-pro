import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqxuuswirettloxbeudp.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'lifeops-auth-v2',
    storage: window.localStorage,
  },
})
