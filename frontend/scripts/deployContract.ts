/**
 * Deploy AgentRegistry to Base Sepolia using a CDP managed wallet.
 * Uses CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY from .env.local.
 * Creates a one-off wallet, deploys the contract, writes AGENT_REGISTRY_CONTRACT to .env.local.
 * No private keys stored anywhere.
 *
 * Run from frontend: npm run deploy:contract
 * Requires: cd ../contracts && npx hardhat compile (artifact exists).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createWallet } from '../lib/cdp/wallet';

async function main() {
  const frontendDir = process.cwd();
  const envPath = join(frontendDir, '.env.local');
  if (!existsSync(envPath)) {
    console.error('.env.local not found in frontend directory');
    process.exit(1);
  }
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }

  if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
    console.error('CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set in .env.local');
    process.exit(1);
  }

  const artifactPath = join(
    frontendDir,
    '../contracts/artifacts/contracts/AgentRegistry.sol/AgentRegistry.json'
  );
  if (!existsSync(artifactPath)) {
    console.error('Contract artifact not found. Run: cd contracts && npx hardhat compile');
    process.exit(1);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
  const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
  const abi = artifact.abi;
  if (!bytecode || !abi) {
    console.error('Invalid artifact: missing bytecode or abi');
    process.exit(1);
  }

  console.log('Creating CDP deployer wallet...');
  const { wallet } = await createWallet();

  console.log('Deploying AgentRegistry...');
  const smartContract = await wallet.deployContract({
    bytecode,
    abi,
    contractName: 'AgentRegistry',
  } as unknown as Parameters<typeof wallet.deployContract>[0]);

  await smartContract.wait();
  const contractAddress =
    (smartContract as { getAddress?: () => string }).getAddress?.() ??
    (smartContract as { address?: string }).address;
  if (!contractAddress) {
    console.error('Deployment failed: no contract address returned');
    process.exit(1);
  }

  console.log('AgentRegistry deployed to:', contractAddress);

  const key = 'AGENT_REGISTRY_CONTRACT';
  let newEnv = envContent;
  if (newEnv.includes(key + '=')) {
    newEnv = newEnv.replace(new RegExp(key + '=.*'), `${key}=${contractAddress}`);
  } else {
    newEnv = newEnv.trimEnd() + '\n' + `${key}=${contractAddress}\n`;
  }
  writeFileSync(envPath, newEnv);
  console.log('Saved AGENT_REGISTRY_CONTRACT to .env.local');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
