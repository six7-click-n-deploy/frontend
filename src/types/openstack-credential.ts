export type OpenStackAuthType = 'v3applicationcredential' | 'password'

export interface OpenStackCredentialBase {
  auth_type: OpenStackAuthType
  auth_url: string
  region_name?: string | null
  interface?: string | null
  identity_api_version?: string | null
  project_id?: string | null
  project_name?: string | null
  user_domain_name?: string | null
  project_domain_name?: string | null
}

export interface OpenStackCredentialUpsert extends OpenStackCredentialBase {
  identifier: string
  secret: string
}

export interface OpenStackCredentialFromYaml {
  clouds_yaml: string
  cloud_name?: string | null
}

export interface OpenStackCredentialResponse extends Partial<OpenStackCredentialBase> {
  has_credential: boolean
  last_validated_at?: string | null
  last_validation_error?: string | null
  created_at?: string | null
  updated_at?: string | null
  is_locked: boolean
  active_deployments: number
}
