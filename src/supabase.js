import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqxuuswirettloxbeudp.supabase.co'
const supabaseKey = 'sb_publishable_6iadSSDQCKEcEKJJ4o8ZKg_GTU85UN-'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'taskflow-auth',
  },
})
