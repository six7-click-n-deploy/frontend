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
    return api.get<Deployment[]>('/deployments/', { params })
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
   * Delete a deployment.
   *
   * The backend picks the right behaviour based on status:
   *   * ``success``/``failed`` → returns 202 ``{task_id, status}`` and
   *     dispatches a Destroy worker task; the SSE stream surfaces the
   *     terraform-destroy progress and the row is auto-soft-deleted on
   *     success.
   *   * ``cancelled`` → 204, immediate soft-delete (no resources to
   *     clean up).
   *   * anything in flight → 409.
   *
   * Callers should branch on ``response.status``: 202 means "watch the
   * live stream, eventually we get redirected", 204 means "done".
   */
  delete: (deploymentId: string) => {
    return api.delete(`/deployments/${deploymentId}`)
  },

  /**
   * Re-send the per-user access mail for one team member of a
   * deployment. Reuses the credentials from the latest successful
   * DEPLOY task's terraform outputs, so this only works after a
   * deploy has completed. 409 if there's nothing to resend yet,
   * 502 if SMTP rejected the mail.
   */
  resendAccess: (deploymentId: string, teamId: string, userId: string) => {
    return api.post(
      `/deployments/${deploymentId}/teams/${teamId}/users/${userId}/resend-access`,
    )
  },
}
