import api from './axios'
import type { Task } from '@/types'

// ----------------------------------------------------------------
// TASK API
// ----------------------------------------------------------------
export const taskApi = {
  /**
   * Get all tasks for a deployment
   */
  listByDeployment: (deploymentId: string) => {
    return api.get<Task[]>(`/tasks/deployment/${deploymentId}`)
  },

  /**
   * Get task by ID
   */
  getById: (taskId: string) => {
    return api.get<Task>(`/tasks/${taskId}`)
  },
}
