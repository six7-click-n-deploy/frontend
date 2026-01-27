import api from './axios'
import type { QuotaOverview } from '@/types/quota'

// ----------------------------------------------------------------
// QUOTAS API
// ----------------------------------------------------------------
export const quotasApi = {
  /**
   * Get OpenStack quota overview
   */
  getOverview: () => {
    return api.get<QuotaOverview>('/quotas/overview')
  }
}