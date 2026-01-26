import { defineStore } from 'pinia'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[],
  }),

  actions: {
    addToast(toast: Omit<Toast, 'id'>) {
      const id = Math.random().toString(36).substring(2, 9)
      const duration = toast.duration || 5000
      
      this.toasts.push({ ...toast, id })

      setTimeout(() => {
        this.removeToast(id)
      }, duration)

      return id
    },

    removeToast(id: string) {
      const index = this.toasts.findIndex((t) => t.id === id)
      if (index > -1) {
        this.toasts.splice(index, 1)
      }
    },

    success(message: string, duration?: number) {
      return this.addToast({ message, type: 'success', duration })
    },

    error(message: string, duration?: number) {
      return this.addToast({ message, type: 'error', duration })
    },

    warning(message: string, duration?: number) {
      return this.addToast({ message, type: 'warning', duration })
    },

    info(message: string, duration?: number) {
      return this.addToast({ message, type: 'info', duration })
    },

    clear() {
      this.toasts = []
    },
  },
})
