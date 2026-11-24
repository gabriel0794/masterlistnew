import { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import MasterList from './components/masterlist/MasterList'
import GIP from './components/gip/GIP'
import OJT from './components/ojt/OJT'
import Login from './components/login/Login'
import { login, logout, storedUsername } from './services/auth'

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(storedUsername()))
  const [active, setActive] = useState('masterlist')

  if (!authenticated) {
    return (
      <Login
        onSubmit={async ({ username, password }) => {
          await login(username, password)
          setAuthenticated(true)
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeId={active} onSelect={setActive} onLogout={async () => {
        await logout()
        setAuthenticated(false)
      }} />

      <main className="flex-1 p-8">
        {active === 'masterlist' && <MasterList />}
        {active === 'gip' && <GIP />}
        {active === 'ojt' && <OJT />}
      </main>
    </div>
  )
}
