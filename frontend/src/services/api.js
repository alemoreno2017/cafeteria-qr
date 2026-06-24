import axios from 'axios'

export const authStorageKey = 'cafeteria_admin_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3333',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(authStorageKey)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
