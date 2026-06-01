import api from './axios'
import type {
  OpenStackCredentialFromYaml,
  OpenStackCredentialResponse,
  OpenStackCredentialUpsert,
} from '@/types/openstack-credential'

// ----------------------------------------------------------------
// OPENSTACK CREDENTIALS API
// ----------------------------------------------------------------
export const credentialsApi = {
  /** Read masked credential status for the current user. Always 200. */
  get: () => api.get<OpenStackCredentialResponse>('/me/openstack-credentials'),

  /** Replace credentials with a fully-formed payload. Auto-validates server-side. */
  put: (payload: OpenStackCredentialUpsert) =>
    api.put<OpenStackCredentialResponse>('/me/openstack-credentials', payload),

  /** Upload raw clouds.yaml; server picks the cloud apart and validates. */
  putFromYaml: (body: OpenStackCredentialFromYaml) =>
    api.put<OpenStackCredentialResponse>('/me/openstack-credentials/from-yaml', body),

  /** Re-authorize the stored credential and refresh `last_validated_at`. */
  test: () => api.post<OpenStackCredentialResponse>('/me/openstack-credentials/test'),

  /** Remove the stored credential. */
  remove: () => api.delete<void>('/me/openstack-credentials'),
}
