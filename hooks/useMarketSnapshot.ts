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

export interface SnapshotMetaResponse {
  generatedAt: string
  totalAssets: number
  sources: SourceSchedule[]
  assetCounts: Record<string, number>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/** Lightweight meta: source schedules + per-source counts (instant, ~1KB) */
export function useMarketSnapshotMeta() {
  return useQuery<SnapshotMetaResponse>({
    queryKey: ['market-snapshot-meta'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/data-node/snapshot/meta`)
      if (!res.ok) throw new Error('Failed to fetch snapshot meta')
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/** Full snapshot with all prices (~3MB gzipped) */
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

/** Filtered snapshot by source IDs (for progressive loading) */
export function useMarketSnapshotBySources(sources: string[]) {
  const sourcesParam = sources.length ? sources.join(',') : null
  return useQuery<SnapshotResponse>({
    queryKey: ['market-snapshot-sources', sourcesParam],
    queryFn: async () => {
      const url = sourcesParam
        ? `${API_URL}/data-node/snapshot?sources=${encodeURIComponent(sourcesParam)}`
        : `${API_URL}/data-node/snapshot`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch market snapshot')
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: sources.length > 0, // Only fetch if sources are provided
  })
}
