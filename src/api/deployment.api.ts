import api from './axios'
import type {
  Deployment,
  DeploymentWithRelations,
  DeploymentCreate,
  DeploymentUpdate,
  DeploymentQueryParams,
  DeploymentStatus,
} from '@/types'

// ----------------------------------------------------------------
// DEPLOYMENT API
// ----------------------------------------------------------------
export const deploymentApi = {
  /**
   * Get all deployments (filtered by role)
   */
  list: (params?: DeploymentQueryParams) => {
    return api.get<Deployment[]>('/deployments', { params })
  },

  /**
   * Get deployment by ID with relations
   */
  getById: (deploymentId: string) => {
    return api.get<DeploymentWithRelations>(`/deployments/${deploymentId}`)
  },

  /**
   * Create deployment
   */
  create: (data: DeploymentCreate) => {
    return api.post<Deployment>('/deployments', data)
  },

  /**
   * Update deployment
   */
  update: (deploymentId: string, data: DeploymentUpdate) => {
    return api.put<Deployment>(`/deployments/${deploymentId}`, data)
  },

  /**
   * Update deployment status
   */
  updateStatus: (deploymentId: string, status: DeploymentStatus) => {
    return api.patch<Deployment>(`/deployments/${deploymentId}/status`, null, {
      params: { new_status: status },
    })
  },

  /**
   * Delete deployment
   */
  delete: (deploymentId: string) => {
    return api.delete(`/deployments/${deploymentId}`)
  },
}
