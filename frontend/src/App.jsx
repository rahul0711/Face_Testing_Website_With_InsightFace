import { useCallback, useState } from 'react'
import { clearToken, getToken } from './api'
import LoginPage from './LoginPage'
import RegistrationPage from './attendance/RegistrationPage'
import Dashboard from './attendance/Dashboard'
import './App.css'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()))
  const [tab, setTab] = useState('dashboard') // 'dashboard' | 'register'
  const [prefillImage, setPrefillImage] = useState(null)

  const handleAuthError = useCallback(() => {
    clearToken()
    setLoggedIn(false)
  }, [])

  const handleEnrollFromCrop = useCallback(async (thumbnailUrl) => {
    const res = await fetch(thumbnailUrl)
    const blob = await res.blob()
    setPrefillImage(blob)
    setTab('register')
  }, [])

  if (!loggedIn) {
    return <LoginPage onLoggedIn={() => setLoggedIn(true)} />
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>CCTV Attendance</h1>
        <nav className="app__tabs">
          <button
            className={`app__tab${tab === 'dashboard' ? ' app__tab--active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`app__tab${tab === 'register' ? ' app__tab--active' : ''}`}
            onClick={() => setTab('register')}
          >
            Register
          </button>
        </nav>
        <span className="app__user">ScriptIndia</span>
        <button className="app__logout" onClick={handleAuthError}>
          Log out
        </button>
      </header>

      {tab === 'dashboard' ? (
        <Dashboard onAuthError={handleAuthError} onEnrollFromCrop={handleEnrollFromCrop} />
      ) : (
        <RegistrationPage
          onAuthError={handleAuthError}
          prefillImage={prefillImage}
          onPrefillConsumed={() => setPrefillImage(null)}
        />
      )}
    </div>
  )
}
