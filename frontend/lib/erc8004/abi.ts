export const AGENT_REGISTRY_ABI = [
  {
    inputs: [{ name: 'agentName', type: 'string' }],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'dealSuccess', type: 'bool' },
    ],
    name: 'updateReputation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getReputation',
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'totalDeals', type: 'uint256' },
      { name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
