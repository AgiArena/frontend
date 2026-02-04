import { useQuery } from '@tanstack/react-query'

export interface SnapshotPrice {
  source: string
  assetId: string
  symbol: string
  name: string
  category: string | null
  value: string
  prevClose: string | null
  changePct: string | null
  volume24h: string | null
  marketCap: string | null
  fetchedAt: string
  imageUrl: string | null
}

export interface SourceSchedule {
  sourceId: string
  displayName: string
  enabled: boolean
  syncIntervalSecs: number
  lastSync: string | null
  nextSync: string | null
  estimatedNextUpdate: string | null
  status: string // healthy | stale | pending | disabled
}

export interface SnapshotResponse {
  generatedAt: string
  maxAgeSecs: number | null
  totalAssets: number
  sources: SourceSchedule[]
  prices: SnapshotPrice[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function useMarketSnapshot() {
  return useQuery<SnapshotResponse>({
    queryKey: ['market-snapshot'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/data-node/snapshot`)
      if (!res.ok) throw new Error('Failed to fetch market snapshot')
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
