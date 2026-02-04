/**
 * ABI definitions for smart contracts used by the frontend
 *
 * Story 4-3: Added bilateral custody contract ABIs.
 * Legacy AgiArenaCore ABI is deprecated but kept for historical bet display.
 */

/**
 * CollateralVault contract ABI (bilateral custody)
 * Handles P2P bilateral bet commitments and settlements
 */
export const collateralVaultAbi = [
  // Events
  {
    type: 'event',
    name: 'BetCommitted',
    inputs: [
      { name: 'betId', type: 'uint256', indexed: true },
      { name: 'partyA', type: 'address', indexed: true },
      { name: 'partyB', type: 'address', indexed: true },
      { name: 'tradesRoot', type: 'bytes32', indexed: false },
      { name: 'partyAAmount', type: 'uint256', indexed: false },
      { name: 'partyBAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BetSettled',
    inputs: [
      { name: 'betId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'payout', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ArbitrationRequested',
    inputs: [
      { name: 'betId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: true },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'commitBet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'partyA', type: 'address' },
      { name: 'partyB', type: 'address' },
      { name: 'tradesRoot', type: 'bytes32' },
      { name: 'partyAAmount', type: 'uint256' },
      { name: 'partyBAmount', type: 'uint256' },
      { name: 'resolutionDeadline', type: 'uint256' },
      { name: 'partyASignature', type: 'bytes' },
      { name: 'partyBSignature', type: 'bytes' },
    ],
    outputs: [{ name: 'betId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'settleBet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'betId', type: 'uint256' },
      { name: 'partyAWins', type: 'bool' },
      { name: 'partyASignature', type: 'bytes' },
      { name: 'partyBSignature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getBet',
    stateMutability: 'view',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'partyA', type: 'address' },
          { name: 'partyB', type: 'address' },
          { name: 'tradesRoot', type: 'bytes32' },
          { name: 'partyAAmount', type: 'uint256' },
          { name: 'partyBAmount', type: 'uint256' },
          { name: 'resolutionDeadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
] as const

/**
 * BotRegistry contract ABI (peer discovery)
 * Handles bot registration and endpoint discovery
 */
export const botRegistryAbi = [
  // Events
  {
    type: 'event',
    name: 'BotRegistered',
    inputs: [
      { name: 'bot', type: 'address', indexed: true },
      { name: 'endpoint', type: 'string', indexed: false },
      { name: 'stake', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BotDeregistered',
    inputs: [
      { name: 'bot', type: 'address', indexed: true },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'isRegistered',
    stateMutability: 'view',
    inputs: [{ name: 'bot', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getBotInfo',
    stateMutability: 'view',
    inputs: [{ name: 'bot', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'endpoint', type: 'string' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'registeredAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getActiveBots',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const

/**
 * ERC20 ABI for USDC token interactions
 * Only includes functions needed for approve and allowance
 */
export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const

/**
 * Bet status enum matching contract BetStatus
 */
export enum BetStatus {
  Pending = 0,
  PartiallyMatched = 1,
  FullyMatched = 2,
  Cancelled = 3,
  Settling = 4,
  Settled = 5
}

/**
 * Bet struct type matching contract Bet struct
 */
export interface Bet {
  betHash: `0x${string}`
  jsonStorageRef: string
  amount: bigint
  matchedAmount: bigint
  creator: `0x${string}`
  status: BetStatus
  createdAt: bigint
}

/**
 * Fill struct type matching contract Fill struct
 */
export interface Fill {
  filler: `0x${string}`
  amount: bigint
  filledAt: bigint
}
