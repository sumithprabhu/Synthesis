import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocCallout, DocList, DocTable } from '@/components/doc-page';

const raw = `# Contracts — Parley Protocol

## ERC-8004 AgentRegistry

Address: 0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305
Network: Base Sepolia (chain ID 84532)
Explorer: https://sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305

Functions:
  register(string agentName) external returns (uint256)
  getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)
  updateReputation(address agent, bool dealSuccess) external

## USDC on Base Sepolia

Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Name: USDC
Version: 2 (EIP-712 domain)
Decimals: 6
Explorer: https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e

## On-chain Proof

Example x402 settlement tx:
https://sepolia.basescan.org/tx/0xde3dbeefa8b0caed96d39327ec8479051a258b63168a0d9986ebedcf8af8bde6

Self-custody transfer tx:
https://basescan.org/tx/0x0e0957843d83b929cc6cebd2d1205a05e9dd865479d79026458a726c5c1a732e
`;

export default function ContractsPage() {
  return (
    <DocPage
      title="Contracts"
      subtitle="On-chain contracts and addresses used by Parley Protocol."
      rawContent={raw}
    >
      <DocH2>ERC-8004 AgentRegistry</DocH2>
      <DocP>
        The AgentRegistry contract stores agent identities and reputation scores on Base Sepolia.
        Parley Protocol reads reputation scores before each negotiation to apply price adjustments.
      </DocP>

      <DocTable
        headers={['Field', 'Value']}
        rows={[
          ['Address', '0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305'],
          ['Network', 'Base Sepolia (chain ID 84532)'],
          ['Explorer', 'sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305'],
        ]}
      />

      <DocH3>ABI</DocH3>
      <DocCode>{`// Register your agent
function register(string agentName) external returns (uint256 agentId)

// Read reputation score (view — no gas)
function getReputation(address agent)
  external view
  returns (uint256 score, uint256 totalDeals, bool exists)

// Update reputation after a deal (called by protocol)
function updateReputation(address agent, bool dealSuccess) external`}</DocCode>

      <DocH3>Reading Reputation with viem</DocH3>
      <DocCode>{`import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({ chain: baseSepolia, transport: http() });

const [score, totalDeals, exists] = await client.readContract({
  address: '0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305',
  abi: parseAbi([
    'function getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)',
  ]),
  functionName: 'getReputation',
  args: ['0xYourAgentWallet'],
});

console.log(\`Score: \${score}/100, Deals: \${totalDeals}, Registered: \${exists}\`);`}</DocCode>

      <DocH3>Reputation Score Effects</DocH3>
      <DocTable
        headers={['Score', 'Price Adjustment', 'Description']}
        rows={[
          ['≥ 80', '−20%', 'Trusted agent, significant discount'],
          ['≥ 60', '−10%', 'Good reputation, moderate discount'],
          ['40 – 59', '0%', 'Neutral — base price applies'],
          ['< 40', '+10%', 'Low reputation — premium charged'],
          ['Not registered', '0%', 'Treated as neutral'],
        ]}
      />

      <DocH2>USDC on Base Sepolia</DocH2>
      <DocP>All payments are settled in USDC on Base Sepolia via EIP-3009 <DocInlineCode>TransferWithAuthorization</DocInlineCode>.</DocP>

      <DocTable
        headers={['Field', 'Value']}
        rows={[
          ['Address', '0x036CbD53842c5426634e7929541eC2318f3dCF7e'],
          ['Name', 'USDC'],
          ['Symbol', 'USDC'],
          ['Decimals', '6 (1 USDC = 1,000,000 units)'],
          ['EIP-712 domain name', '"USDC"'],
          ['EIP-712 domain version', '"2"'],
          ['Explorer', 'sepolia.basescan.org/token/0x036CbD...'],
        ]}
      />

      <DocCallout type="warning">
        The EIP-712 domain <DocInlineCode>name</DocInlineCode> must be exactly <DocInlineCode>"USDC"</DocInlineCode> (not "USD Coin") and <DocInlineCode>version</DocInlineCode> must be <DocInlineCode>"2"</DocInlineCode>. Using wrong values causes <DocInlineCode>invalid_exact_evm_token_name_mismatch</DocInlineCode>.
      </DocCallout>

      <DocH2>x402 Facilitator</DocH2>
      <DocTable
        headers={['Field', 'Value']}
        rows={[
          ['URL', 'https://x402.org/facilitator'],
          ['Version', 'x402 v1'],
          ['Scheme', 'exact'],
          ['Supported networks', 'base-sepolia, base'],
        ]}
      />

      <DocCode>{`// Server-side verify + settle
import { useFacilitator } from 'x402/verify';

const { verify, settle } = useFacilitator({ url: 'https://x402.org/facilitator' });

const { isValid } = await verify(paymentPayload, paymentRequirements);
const { success, transaction } = await settle(paymentPayload, paymentRequirements);
// transaction = on-chain tx hash`}</DocCode>

      <DocH2>On-chain Proof</DocH2>
      <DocTable
        headers={['Event', 'Transaction']}
        rows={[
          ['Example x402 USDC settlement', '0xde3dbeefa8b0caed96d39327ec8479051a258b63168a0d9986ebedcf8af8bde6'],
          ['Agent self-custody transfer', '0x0e0957843d83b929cc6cebd2d1205a05e9dd865479d79026458a726c5c1a732e'],
        ]}
      />

      <DocList items={[
        'AgentRegistry on Basescan: sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305',
        'USDC on Basescan: sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        'Example payment tx: sepolia.basescan.org/tx/0xde3dbeef...',
      ]} />
    </DocPage>
  );
}
