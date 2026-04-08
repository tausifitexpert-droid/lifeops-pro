import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LandingApp from './Landing.jsx'

function Root() {
  // Show landing by default, app when user clicks Sign In / Sign Up / Dashboard
  const [view, setView] = useState('landing')

  return view === 'landing'
    ? <LandingApp onEnterApp={() => setView('app')} />
    : <App onBackToLanding={() => setView('landing')} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
