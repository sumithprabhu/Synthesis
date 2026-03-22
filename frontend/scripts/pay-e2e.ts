import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

async function main() {
  const account = privateKeyToAccount('0x6691c599507a96750ad7e061b0c6adbf066fe41971c7645034088baa6f9af9ea');
  const pub = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
  const wal = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });

  const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const usdcAbi = parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address,uint256) returns (bool)',
  ]);

  const bal = await pub.readContract({ address: USDC, abi: usdcAbi, functionName: 'balanceOf', args: [account.address] });
  console.log('Consumer USDC balance:', Number(bal) / 1e6, 'USDC');

  // Send 0.001 USDC (1000 raw) to the publisher wallet
  const pubWallet = '0x51a126d0ed841f8339d6dd041ecf23c00b6e6e92';
  const hash = await wal.writeContract({
    address: USDC,
    abi: usdcAbi,
    functionName: 'transfer',
    args: [pubWallet as `0x${string}`, BigInt(1000)],
  });
  console.log('Payment TX:', hash);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block:', receipt.blockNumber.toString());
  console.log('HASH:', hash);
}

main().catch(console.error);
