/**
 * Market ID Parser Utilities
 *
 * Handles parsing and encoding of market IDs in the format:
 * `{source}:{resolution}:{raw_id}`
 *
 * Examples:
 * - `polymarket:keeper:0x123abc...` - Polymarket with keeper voting
 * - `coingecko:deterministic:bitcoin` - CoinGecko with auto-resolution
 */

export type DataSource = 'polymarket' | 'coingecko';
export type ResolutionMethod = 'keeper' | 'deterministic';

export interface ParsedMarketId {
  /** Price data source */
  dataSource: DataSource;
  /** Resolution method */
  resolutionMethod: ResolutionMethod;
  /** Raw market identifier (condition_id for Polymarket, coin_id for CoinGecko) */
  rawId: string;
  /** Full encoded market ID string */
  fullEncoded: string;
}

/**
 * Parse a market ID string into components
 *
 * Supports two formats:
 * 1. New encoded format: `{source}:{resolution}:{raw_id}`
 * 2. Legacy format (plain string): treated as `polymarket:keeper:{raw_id}`
 */
export function parseMarketId(marketId: string): ParsedMarketId {
  const parts = marketId.split(':');

  if (parts.length >= 3) {
    // New encoded format: source:resolution:raw_id
    const dataSource = parseDataSource(parts[0]);
    const resolutionMethod = parseResolutionMethod(parts[1]);
    const rawId = parts.slice(2).join(':'); // Handle raw_ids that might contain colons

    return {
      dataSource,
      resolutionMethod,
      rawId,
      fullEncoded: marketId,
    };
  }

  // Legacy format: treat as polymarket:keeper:{raw_id}
  return {
    dataSource: 'polymarket',
    resolutionMethod: 'keeper',
    rawId: marketId,
    fullEncoded: encodeMarketId('polymarket', 'keeper', marketId),
  };
}

/**
 * Encode a market ID from components
 */
export function encodeMarketId(
  source: DataSource,
  method: ResolutionMethod,
  rawId: string
): string {
  return `${source}:${method}:${rawId}`;
}

function parseDataSource(s: string): DataSource {
  const lower = s.toLowerCase();
  if (lower === 'polymarket') return 'polymarket';
  if (lower === 'coingecko') return 'coingecko';
  return 'polymarket'; // Default
}

function parseResolutionMethod(s: string): ResolutionMethod {
  const lower = s.toLowerCase();
  if (lower === 'keeper') return 'keeper';
  if (lower === 'deterministic') return 'deterministic';
  return 'keeper'; // Default
}

/**
 * Get the URL to view a market on its source platform
 */
export function getMarketUrl(parsed: ParsedMarketId): string {
  switch (parsed.dataSource) {
    case 'polymarket':
      // Polymarket uses condition IDs in URLs
      return `https://polymarket.com/event/${parsed.rawId}`;
    case 'coingecko':
      // CoinGecko uses coin IDs in URLs
      return `https://www.coingecko.com/en/coins/${parsed.rawId}`;
    default:
      return '#';
  }
}

/**
 * Get source badge styling information
 */
export function getSourceBadge(dataSource: DataSource): {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
} {
  switch (dataSource) {
    case 'polymarket':
      return {
        label: 'Polymarket',
        icon: '📊',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
      };
    case 'coingecko':
      return {
        label: 'CoinGecko',
        icon: '🦎',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
      };
    default:
      return {
        label: 'Unknown',
        icon: '❓',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-700 dark:text-gray-300',
      };
  }
}

/**
 * Get resolution method badge styling information
 */
export function getResolutionBadge(method: ResolutionMethod): {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
} {
  switch (method) {
    case 'keeper':
      return {
        label: 'Keeper Vote',
        icon: '🗳️',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
      };
    case 'deterministic':
      return {
        label: 'Auto-Resolve',
        icon: '⚡',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        label: 'Unknown',
        icon: '❓',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-700 dark:text-gray-300',
      };
  }
}

/**
 * Check if a market ID is from Polymarket
 */
export function isPolymarket(marketId: string): boolean {
  const parsed = parseMarketId(marketId);
  return parsed.dataSource === 'polymarket';
}

/**
 * Check if a market ID is from CoinGecko
 */
export function isCoinGecko(marketId: string): boolean {
  const parsed = parseMarketId(marketId);
  return parsed.dataSource === 'coingecko';
}

/**
 * Format position string based on data source
 * - Polymarket: YES/NO (prediction market)
 * - CoinGecko: LONG/SHORT (price direction)
 */
export function formatPosition(
  position: number | string,
  dataSource: DataSource
): string {
  const posValue = typeof position === 'string' ? parseInt(position, 10) : position;
  const isPositive = posValue === 1;

  if (dataSource === 'coingecko') {
    return isPositive ? 'LONG' : 'SHORT';
  }
  return isPositive ? 'YES' : 'NO';
}
