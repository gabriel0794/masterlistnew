const tokenKey = 'masterlist-auth-token'
const userKey = 'masterlist-auth-user'

type LoginResponse = {
  token: string
  user: { username: string }
}

export async function login(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json() as LoginResponse & { message?: string }
  if (!response.ok) throw new Error(data.message ?? 'Unable to sign in.')

  localStorage.setItem(tokenKey, data.token)
  localStorage.setItem(userKey, data.user.username)
  return data.user
}

export async function logout() {
  const token = localStorage.getItem(tokenKey)
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }
  localStorage.removeItem(tokenKey)
  localStorage.removeItem(userKey)
}

export function storedUsername() {
  return localStorage.getItem(userKey)
}
