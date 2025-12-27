import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

/**
 * Composable für Auth Helpers
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)

  const login = async (username: string, password: string) => {
    await authStore.login({ username, password })
  }

  const register = async (data: {
    email: string
    password: string
    username: string
    role?: string
    courseId?: string
  }) => {
    await authStore.register(data)
  }

  const logout = async () => {
    await authStore.logout()
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  }
}
