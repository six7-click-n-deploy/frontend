import api from './axios'

export const getUserApi = (id: string) => {
  return api.get(`/users/${id}`)
}

export const updateUserApi = (id: string, data: {
  name: string
  email: string
}) => {
  return api.put(`/users/${id}`, data)
}

export const changePasswordApi = (data: {
  oldPassword: string
  newPassword: string
}) => {
  return api.post('/users/change-password', data)
}