import { describe, it, expect, vi } from 'vitest'

// Mock the axios wrapper before importing the api module
vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { quotasApi } from './quotas.api'
import api from './axios'

describe('quotasApi', () => {
  it('calls GET /quotas/overview and returns data', async () => {
    const mockData = { total: 5 }
    ;(api.get as any).mockResolvedValue({ data: mockData })

    const res = await quotasApi.getOverview()

    expect(api.get).toHaveBeenCalledWith('/quotas/overview')
    expect(res.data).toEqual(mockData)
  })
})
