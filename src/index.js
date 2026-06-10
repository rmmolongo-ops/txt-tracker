import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import App from './components/App'

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 40 }}>⚽</div>
    </div>
  )

  return user ? <App user={user} onSignOut={handleSignOut} /> : <Auth />
}

const root = createRoot(document.getElementById('root'))
root.render(<Root />)
