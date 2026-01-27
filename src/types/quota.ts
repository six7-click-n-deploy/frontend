export interface QuotaItem {
  used: number
  limit: number
  available: number
  unit?: string
}

export interface ComputeQuotas {
  instances: QuotaItem
  vcpus: QuotaItem
  ram: QuotaItem
}

export interface StorageQuotas {
  volumes: QuotaItem
  snapshots: QuotaItem
  gigabytes: QuotaItem
}

export interface NetworkQuotas {
  floating_ips: QuotaItem
  security_groups: QuotaItem
  security_group_rules: QuotaItem
  networks: QuotaItem
  ports: QuotaItem
  routers: QuotaItem
}

export interface QuotaOverview {
  compute: ComputeQuotas
  storage: StorageQuotas
  network: NetworkQuotas
}
