import { PrismaClient } from '@prisma/client';
import { createWallet } from '../lib/cdp/wallet';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@contentagents.dev';
  const existing = await prisma.publisher.findUnique({
    where: { email },
  });
  if (existing) {
    console.log('Demo publisher already exists:', existing.id);
    return;
  }

  const { walletId, address } = await createWallet();
  const pub = await prisma.publisher.create({
    data: {
      email,
      name: 'Demo Publisher',
      walletAddress: address,
      cdpWalletId: walletId,
      generosity: 5,
      minPrice: 0.001,
      reputationThreshold: 3,
    },
  });
  console.log('Seeded publisher:', pub.id, 'CDP wallet:', walletId);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
