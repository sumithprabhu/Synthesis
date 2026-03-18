import { Wallet } from '@coinbase/coinbase-sdk';
import { ensureConfigured } from './config';
import { prisma } from '@/lib/prisma';

const NETWORK_ID = 'base-sepolia';

export type WalletWithAddress = {
  wallet: Wallet;
  address: string;
  walletId: string;
};

function getAddressFromDefaultAddress(defaultAddress: Awaited<ReturnType<Wallet['getDefaultAddress']>>): string {
  if (typeof defaultAddress === 'string') return defaultAddress;
  const addr = (defaultAddress as { getAddressId?: () => string; address?: string });
  return addr.getAddressId?.() ?? addr.address ?? String(defaultAddress);
}

/**
 * Create a new CDP managed wallet (e.g. for publisher registration or consumer session).
 * Never stores private keys; wallet is backed by CDP Server Signer.
 */
export async function createWallet(): Promise<WalletWithAddress> {
  ensureConfigured();
  const wallet = await Wallet.create({ networkId: NETWORK_ID });
  const walletId = wallet.getId();
  if (!walletId) throw new Error('Wallet created but no ID returned');
  const defaultAddress = await wallet.getDefaultAddress();
  const address = getAddressFromDefaultAddress(defaultAddress);
  if (!address) throw new Error('Wallet has no default address');
  return { wallet, address, walletId };
}

/**
 * Load an existing CDP wallet by ID (e.g. from Publisher.cdpWalletId).
 */
export async function loadWallet(walletId: string): Promise<WalletWithAddress> {
  ensureConfigured();
  const wallet = await Wallet.fetch(walletId);
  const defaultAddress = await wallet.getDefaultAddress();
  const address = getAddressFromDefaultAddress(defaultAddress);
  if (!address) throw new Error('Wallet has no default address');
  return { wallet, address, walletId };
}

/**
 * Get CDP wallet and address for a publisher (for signing ERC-8004 txs, payTo, etc.).
 */
export async function getPublisherWallet(publisherId: string): Promise<WalletWithAddress> {
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });
  if (!publisher?.cdpWalletId) {
    throw new Error(`Publisher ${publisherId} has no CDP wallet`);
  }
  return loadWallet(publisher.cdpWalletId);
}

/**
 * Create a CDP wallet for a new publisher and save walletId + address to DB.
 */
export async function createPublisherWallet(publisherId: string): Promise<WalletWithAddress> {
  const { wallet, address, walletId } = await createWallet();
  await prisma.publisher.update({
    where: { id: publisherId },
    data: { cdpWalletId: walletId, walletAddress: address },
  });
  return { wallet, address, walletId };
}
