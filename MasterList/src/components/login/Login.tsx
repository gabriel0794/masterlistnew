import { useState, type FormEvent } from 'react'

type LoginProps = {
  onSubmit: (credentials: { username: string; password: string }) => Promise<void>
}

export default function Login({ onSubmit }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit({ username, password })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <header className="bg-[#17652a] px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-100">Department of Health</p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-green-100">Sign in to the Personnel Master List</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-7 sm:px-10 sm:py-8">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
            Username
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-normal normal-case text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </label>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-normal normal-case text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#17652a] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-xs text-slate-500">For authorized personnel only</p>
        </form>
      </section>
    </main>
  )
}
