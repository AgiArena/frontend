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

export type DataSource = 'polymarket' | 'coingecko' | 'stocks' | 'openmeteo';
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
  if (lower === 'stocks') return 'stocks';
  if (lower === 'openmeteo') return 'openmeteo';
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
      return `https://polymarket.com/event/${parsed.rawId}`;
    case 'coingecko':
      return `https://www.coingecko.com/en/coins/${parsed.rawId}`;
    case 'stocks':
      return `https://finance.yahoo.com/quote/${parsed.rawId}`;
    case 'openmeteo':
      // Parse city from rawId (format: city-id-metric)
      const cityId = parsed.rawId.replace(/-temperature_2m$|-rain$|-wind_speed_10m$|-pm2_5$|-ozone$/, '');
      return `https://open-meteo.com/en/docs#latitude=0&longitude=0`; // Open-Meteo doesn't have city pages
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
    case 'stocks':
      return {
        label: 'Stocks',
        icon: '📈',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
      };
    case 'openmeteo':
      return {
        label: 'Weather',
        icon: '🌤️',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        textColor: 'text-cyan-700 dark:text-cyan-300',
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
 * Check if a market ID is from Stocks
 */
export function isStocks(marketId: string): boolean {
  const parsed = parseMarketId(marketId);
  return parsed.dataSource === 'stocks';
}

/**
 * Check if a market ID is from Open-Meteo (weather)
 */
export function isOpenMeteo(marketId: string): boolean {
  const parsed = parseMarketId(marketId);
  return parsed.dataSource === 'openmeteo';
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

  if (dataSource === 'coingecko' || dataSource === 'stocks' || dataSource === 'openmeteo') {
    return isPositive ? 'LONG' : 'SHORT';
  }
  return isPositive ? 'YES' : 'NO';
}

/**
 * Parse weather market rawId to extract city and metric
 * Format: {city_id}-{metric} e.g., "paris-fr-temperature_2m"
 */
export function parseWeatherMarketId(rawId: string): {
  cityId: string;
  metric: string;
  displayCity: string;
  displayMetric: string;
} | null {
  const metrics = ['temperature_2m', 'rain', 'wind_speed_10m', 'pm2_5', 'ozone'];

  for (const metric of metrics) {
    if (rawId.endsWith(`-${metric}`)) {
      const cityId = rawId.slice(0, -(metric.length + 1));
      return {
        cityId,
        metric,
        displayCity: formatCityName(cityId),
        displayMetric: formatMetricName(metric),
      };
    }
  }

  return null;
}

/**
 * Format city ID to display name
 * e.g., "paris-fr" -> "Paris, FR"
 */
function formatCityName(cityId: string): string {
  const parts = cityId.split('-');
  if (parts.length < 2) return cityId;

  const countryCode = parts.pop()!.toUpperCase();
  const cityName = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return `${cityName}, ${countryCode}`;
}

/**
 * Format metric name to display
 */
function formatMetricName(metric: string): string {
  const metricLabels: Record<string, string> = {
    'temperature_2m': 'Temperature',
    'rain': 'Rain',
    'wind_speed_10m': 'Wind Speed',
    'pm2_5': 'PM2.5',
    'ozone': 'Ozone',
  };
  return metricLabels[metric] || metric;
}

/**
 * Get weather metric icon
 */
export function getWeatherMetricIcon(metric: string): string {
  const metricIcons: Record<string, string> = {
    'temperature_2m': '🌡️',
    'rain': '🌧️',
    'wind_speed_10m': '💨',
    'pm2_5': '😷',
    'ozone': '☀️',
  };
  return metricIcons[metric] || '🌤️';
}

/**
 * Format weather value with appropriate unit
 */
export function formatWeatherValue(value: number, metric: string): string {
  const units: Record<string, string> = {
    'temperature_2m': '°C',
    'rain': 'mm',
    'wind_speed_10m': 'km/h',
    'pm2_5': 'μg/m³',
    'ozone': 'μg/m³',
  };

  const unit = units[metric] || '';
  const decimals = metric === 'temperature_2m' ? 1 : metric === 'rain' ? 1 : 0;

  return `${value.toFixed(decimals)}${unit}`;
}
