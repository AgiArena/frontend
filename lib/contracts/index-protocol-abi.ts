/**
 * ABI definitions for Index Protocol contracts
 * Based on actual BridgeProxy.sol contract
 */

// BridgeProxy ABI - for creating ITPs via bridge
export const BRIDGE_PROXY_ABI = [
  // Request ITP creation (user calls this)
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'weights', type: 'uint256[]' },
      { name: 'assets', type: 'address[]' },
    ],
    name: 'requestCreateItp',
    outputs: [{ name: 'nonce', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get pending creation details
  {
    inputs: [{ name: 'nonce', type: 'uint256' }],
    name: 'getPendingCreation',
    outputs: [
      { name: 'admin', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'weights', type: 'uint256[]' },
      { name: 'assets', type: 'address[]' },
      { name: 'createdAt', type: 'uint64' },
      { name: 'completed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Check if pending
  {
    inputs: [{ name: 'nonce', type: 'uint256' }],
    name: 'isPending',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Next creation nonce
  {
    inputs: [],
    name: 'nextCreationNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Signer threshold
  {
    inputs: [],
    name: 'signerThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get admin nonce
  {
    inputs: [{ name: 'admin', type: 'address' }],
    name: 'getAdminItpCreationNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Constants
  {
    inputs: [],
    name: 'MAX_ASSETS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_WEIGHT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'WEIGHT_SUM',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'admin', type: 'address' },
      { indexed: true, name: 'nonce', type: 'uint256' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: false, name: 'weights', type: 'uint256[]' },
      { indexed: false, name: 'assets', type: 'address[]' },
    ],
    name: 'CreateItpRequested',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orbitItpId', type: 'bytes32' },
      { indexed: true, name: 'bridgedItpAddress', type: 'address' },
      { indexed: true, name: 'nonce', type: 'uint256' },
      { indexed: false, name: 'admin', type: 'address' },
    ],
    name: 'ItpCreated',
    type: 'event',
  },
] as const

// Index.sol ABI - for buying/selling ITPs on L3
export const INDEX_ABI = [
  // Buy ITP
  {
    inputs: [
      { name: 'itpId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'buy',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // Sell ITP
  {
    inputs: [
      { name: 'itpId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get ITP count
  {
    inputs: [],
    name: 'itpCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// BridgedITP (ERC20) ABI
export const BRIDGED_ITP_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
