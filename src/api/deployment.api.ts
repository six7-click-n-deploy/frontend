import api from './axios'
import type {
  Deployment,
  DeploymentWithRelations,
  DeploymentCreate,
  DeploymentQueryParams,
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
   * Delete a deployment.
   *
   * The backend picks the right behaviour based on status:
   *   * ``success``/``failed``/``paused`` → returns 202 ``{task_id, status}`` and
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
   * Pause a running deployment.
   *
   * Halts the OpenStack compute instances of the deployment without
   * tearing them down — volumes and networks are preserved so resume
   * restores the same instances byte-for-byte.
   *
   * Owner-only. Allowed only when status is ``success``. Returns 202
   * with ``{task_id, status: "pausing"}``; the frontend should attach
   * to the SSE stream just like for delete/destroy.
   */
  pause: (deploymentId: string) => {
    return api.post<{ task_id: string; status: 'pausing' }>(
      `/deployments/${deploymentId}/pause`,
    )
  },

  /**
   * Resume a paused deployment.
   *
   * Owner-only. Allowed only when status is ``paused``. Same response
   * shape as ``pause`` but with ``status: "resuming"``.
   */
  resume: (deploymentId: string) => {
    return api.post<{ task_id: string; status: 'resuming' }>(
      `/deployments/${deploymentId}/resume`,
    )
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
