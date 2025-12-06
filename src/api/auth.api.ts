import api from './axios'

export const loginApi = (payload: {
  email: string
  password: string
}) => {
  return api.post('/auth/login', payload)
}

export const meApi = () => {
  return api.get('/auth/me')
}
