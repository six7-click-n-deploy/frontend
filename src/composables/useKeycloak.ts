import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts'
import { ref, readonly } from 'vue'

// ----------------------------------------------------------------
// KEYCLOAK CONFIGURATION
// ----------------------------------------------------------------
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'dhbw'
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'appstore-frontend'
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'

// ----------------------------------------------------------------
// USER MANAGER SETUP
// ----------------------------------------------------------------
const userManager = new UserManager({
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  client_id: CLIENT_ID,
  redirect_uri: `${APP_URL}/callback`,
  post_logout_redirect_uri: `${APP_URL}/login`,
  response_type: 'code',
  scope: 'openid profile email',
  
  // Use localStorage for state
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  
  // Automatic silent renew
  automaticSilentRenew: true,
  silent_redirect_uri: `${APP_URL}/silent-refresh.html`,
  
  // Token settings
  loadUserInfo: true,
  
  // Metadata settings (optional, will be fetched automatically)
  metadataUrl: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`,
})

// ----------------------------------------------------------------
// REACTIVE STATE
// ----------------------------------------------------------------
const user = ref<User | null>(null)
const isLoading = ref(true)
const isAuthenticated = ref(false)

// ----------------------------------------------------------------
// COMPOSABLE
// ----------------------------------------------------------------
export function useKeycloak() {
  /**
   * Initialize authentication - load user from storage
   */
  async function initialize() {
    isLoading.value = true
    try {
      const storedUser = await userManager.getUser()
      if (storedUser && !storedUser.expired) {
        user.value = storedUser
        isAuthenticated.value = true
      } else {
        user.value = null
        isAuthenticated.value = false
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      user.value = null
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Redirect to Keycloak login
   */
  async function login(returnUrl?: string) {
    try {
      // Store return URL for after login
      if (returnUrl) {
        sessionStorage.setItem('returnUrl', returnUrl)
      }
      await userManager.signinRedirect()
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  /**
   * Handle callback from Keycloak after login
   */
  async function handleCallback() {
    try {
      const callbackUser = await userManager.signinRedirectCallback()
      user.value = callbackUser
      isAuthenticated.value = true
      
      // Get return URL and clean up
      const returnUrl = sessionStorage.getItem('returnUrl') || '/'
      sessionStorage.removeItem('returnUrl')
      
      return returnUrl
    } catch (error) {
      console.error('Callback handling failed:', error)
      throw error
    }
  }

  /**
   * Logout and redirect to Keycloak
   */
  async function logout() {
    try {
      await userManager.signoutRedirect()
      user.value = null
      isAuthenticated.value = false
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  /**
   * Get current access token
   */
  async function getAccessToken(): Promise<string | null> {
    try {
      const currentUser = await userManager.getUser()
      return currentUser?.access_token || null
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }

  /**
   * Get user info
   */
  async function getUser(): Promise<User | null> {
    try {
      return await userManager.getUser()
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  /**
   * Check if token is expired and refresh if needed
   */
  async function ensureValidToken(): Promise<boolean> {
    try {
      const currentUser = await userManager.getUser()
      
      if (!currentUser) {
        return false
      }
      
      if (currentUser.expired) {
        // Try to refresh silently
        const refreshedUser = await userManager.signinSilent()
        user.value = refreshedUser
        return true
      }
      
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  return {
    // State
    user: readonly(user),
    isLoading: readonly(isLoading),
    isAuthenticated: readonly(isAuthenticated),
    
    // Methods
    initialize,
    login,
    handleCallback,
    logout,
    getAccessToken,
    getUser,
    ensureValidToken,
  }
}
