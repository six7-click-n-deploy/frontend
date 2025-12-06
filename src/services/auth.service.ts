import { loginApi, meApi } from '@/api/auth.api'

export type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

/* ✅ MOCK USER */
const MOCK_USER: User = {
  id: '1',
  name: 'Prof. Dr. Eichberg',
  email: 'eichberg@six7.de',
  role: 'admin',
}

/* ✅ MOCK LOGIN */
const mockLogin = async (
  email: string,
  password: string
): Promise<User> => {
  await new Promise((r) => setTimeout(r, 800)) // Fake Loading

  if (email === 'admin@six7.de' && password === '1234') {
    localStorage.setItem('token', 'mock-token')
    return MOCK_USER
  }

  throw new Error('Invalid credentials (mock)')
}

/* ✅ MOCK ME */
const mockFetchMe = async (): Promise<User> => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Not authenticated')
  return MOCK_USER
}

/* ✅ LOGIN SERVICE */
export const loginService = async (
  email: string,
  password: string
): Promise<User> => {
  if (USE_MOCK) {
    return mockLogin(email, password)
  }

  const { data } = await loginApi({ email, password })
  localStorage.setItem('token', data.token)
  return data.user
}

/* ✅ AUTO LOGIN */
export const fetchMeService = async (): Promise<User> => {
  if (USE_MOCK) {
    return mockFetchMe()
  }

  const { data } = await meApi()
  return data
}

/* ✅ LOGOUT */
export const logoutService = async () => {
  localStorage.removeItem('token')
}
