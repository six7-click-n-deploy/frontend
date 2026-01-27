import { ref, computed } from 'vue'
import { Cpu, HardDrive, Network } from 'lucide-vue-next'
import { quotasApi } from '@/api/quotas.api'
import type { QuotaOverview } from '@/types/quota'

// ----------------------------------------------------------------
// USE QUOTAS COMPOSABLE
// ----------------------------------------------------------------
export const useQuotas = () => {
  const quotas = ref<QuotaOverview | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Helper: Berechne Prozent
  const getPercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0
    return Math.round((used / limit) * 100)
  }

  // Helper: Farbe basierend auf Auslastung
  const getColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Computed: Formatierte Quota-Daten
  const formattedQuotas = computed(() => {
    if (!quotas.value) return []

    const { compute, storage, network } = quotas.value

    return [
      {
        icon: Cpu,
        label: 'VMs / Instanzen',
        used: compute.instances.used,
        limit: compute.instances.limit,
        percentage: getPercentage(compute.instances.used, compute.instances.limit),
        unit: ''
      },
      {
        icon: Cpu,
        label: 'vCPUs',
        used: compute.vcpus.used,
        limit: compute.vcpus.limit,
        percentage: getPercentage(compute.vcpus.used, compute.vcpus.limit),
        unit: ''
      },
      {
        icon: Cpu,
        label: 'RAM',
        used: Math.round(compute.ram.used / 1024), // MB → GB
        limit: Math.round(compute.ram.limit / 1024),
        percentage: getPercentage(compute.ram.used, compute.ram.limit),
        unit: 'GB'
      },
      {
        icon: HardDrive,
        label: 'Volumes',
        used: storage.volumes.used,
        limit: storage.volumes.limit,
        percentage: getPercentage(storage.volumes.used, storage.volumes.limit),
        unit: ''
      },
      {
        icon: HardDrive,
        label: 'Storage',
        used: storage.gigabytes.used,
        limit: storage.gigabytes.limit,
        percentage: getPercentage(storage.gigabytes.used, storage.gigabytes.limit),
        unit: 'GB'
      },
      {
        icon: Network,
        label: 'Floating IPs',
        used: network.floating_ips.used,
        limit: network.floating_ips.limit,
        percentage: getPercentage(network.floating_ips.used, network.floating_ips.limit),
        unit: ''
      }
    ]
  })

  // Fetch quotas
  const fetchQuotas = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await quotasApi.getOverview()
      quotas.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch quotas'
      console.error('Quota fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    quotas,
    loading,
    error,
    formattedQuotas,
    fetchQuotas,
    getColorClass
  }
}