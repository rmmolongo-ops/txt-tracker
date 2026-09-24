import { createClient } from '@supabase/supabase-js'

// Base de production par défaut ; les aperçus Vercel peuvent pointer vers une base de test
// en définissant REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://iujwziigoedxpodecdld.supabase.co'
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1and6aWlnb2VkeHBvZGVjZGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjgzMDYsImV4cCI6MjA5NjYwNDMwNn0.kI-twUeep-HSXuU2xHDNKF69dhdgIb33r5I5ET5jKbk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
