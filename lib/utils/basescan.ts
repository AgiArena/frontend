/**
 * BaseScan URL utilities for Base mainnet
 */

/**
 * Base mainnet BaseScan URL
 */
const BASESCAN_URL = 'https://basescan.org'

/**
 * Generate BaseScan URL for a transaction
 * @param txHash - The transaction hash
 * @returns Full BaseScan URL for the transaction
 */
export function getTxUrl(txHash: string): string {
  return `${BASESCAN_URL}/tx/${txHash}`
}

/**
 * Generate BaseScan URL for an address
 * @param address - The address
 * @returns Full BaseScan URL for the address
 */
export function getAddressUrl(address: string): string {
  return `${BASESCAN_URL}/address/${address}`
}

/**
 * Generate BaseScan URL for a contract
 * @param address - The contract address
 * @returns Full BaseScan URL for the contract
 */
export function getContractUrl(address: string): string {
  return `${BASESCAN_URL}/address/${address}#code`
}
