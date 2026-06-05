/**
 * Read-API für die OpenStack-Resourcen des aktuellen Users.
 *
 * Wird vom ``OpenStackResourcePicker`` genutzt, damit Wizard-User
 * keine UUIDs aus Horizon abtippen müssen. Backend cached die Antworten
 * 60 s — Frontend sollte daher unbedacht aufrufen können, ohne
 * Keystone-Token-Sturm auszulösen.
 *
 * Fehlerstrategie: das Backend antwortet 412 (Credentials fehlen) /
 * 502 (OpenStack-API down) / 200 (mit Daten) — der Picker wertet das
 * Status-Feld aus und rendert entsprechende Fallbacks.
 */
import api from './axios'

// ----------------------------------------------------------------
// Resource-Shapes — flach gehalten, nur was die UI braucht.
// ----------------------------------------------------------------
export interface OsResourceBase {
  id: string
  name: string
}

export interface OsNetwork extends OsResourceBase {
  description: string
  shared: boolean
  external: boolean
  status: string
}

export interface OsSubnet extends OsResourceBase {
  cidr: string
  ip_version: number
  network_id: string
  gateway_ip: string
}

export interface OsFlavor extends OsResourceBase {
  vcpus: number
  ram: number   // MB
  disk: number  // GB
  is_public: boolean
}

export interface OsImage extends OsResourceBase {
  status: string
  visibility: string
  size: number
  disk_format: string
}

export interface OsKeypair extends OsResourceBase {
  fingerprint: string
  type: string
}

export interface OsSecurityGroup extends OsResourceBase {
  description: string
}

export interface OsFloatingIpPool extends OsResourceBase {
  description: string
}

export interface OsVolume extends OsResourceBase {
  size: number
  status: string
  volume_type: string
  bootable: boolean
}

export interface OsRouter extends OsResourceBase {
  status: string
  external_gateway_info: any
}

export interface OsAvailabilityZone extends OsResourceBase {
  state: string
}

// Discriminated Union der unterstützten Resource-Typen — bleibt
// EXAKT synchron mit ``backend/app/routers/apps.py:_OS_TYPES``.
export type OsResourceType =
  | 'network'
  | 'subnet'
  | 'flavor'
  | 'image'
  | 'keypair'
  | 'security_group'
  | 'floating_ip_pool'
  | 'volume'
  | 'router'
  | 'availability_zone'

// ----------------------------------------------------------------
// Endpoints
// ----------------------------------------------------------------
export const openstackResourcesApi = {
  listNetworks: () => api.get<OsNetwork[]>('/me/openstack/resources/networks'),

  listSubnets: (networkId?: string) =>
    api.get<OsSubnet[]>('/me/openstack/resources/subnets', {
      params: networkId ? { network_id: networkId } : undefined,
    }),

  listFlavors: () => api.get<OsFlavor[]>('/me/openstack/resources/flavors'),

  listImages: (statusFilter: string = 'active') =>
    api.get<OsImage[]>('/me/openstack/resources/images', {
      params: { status: statusFilter },
    }),

  listKeypairs: () => api.get<OsKeypair[]>('/me/openstack/resources/keypairs'),

  listSecurityGroups: () =>
    api.get<OsSecurityGroup[]>('/me/openstack/resources/security-groups'),

  listFloatingIpPools: () =>
    api.get<OsFloatingIpPool[]>('/me/openstack/resources/floating-ip-pools'),

  listVolumes: () => api.get<OsVolume[]>('/me/openstack/resources/volumes'),

  listRouters: () => api.get<OsRouter[]>('/me/openstack/resources/routers'),

  listAvailabilityZones: (service: 'compute' | 'network' | 'volume' = 'compute') =>
    api.get<OsAvailabilityZone[]>('/me/openstack/resources/availability-zones', {
      params: { service },
    }),

  /** Cache-Bust für den User. ``kind`` optional, sonst alles. */
  refresh: (kind?: OsResourceType) =>
    api.post('/me/openstack/resources/refresh', null, {
      params: kind ? { kind } : undefined,
    }),
}
