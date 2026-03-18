// x402 payment middleware for GET /api/content/:id
// Dynamic price is set per-request from negotiation; default config for middleware registration
export const x402RouteConfig = {
  'GET /api/content/:id': {
    price: '$0.002',
    network: 'base-sepolia',
    description: 'Article content access',
    payTo: '' as string, // set per-request from publisher wallet
  },
};

// Helper to get payTo address for an article (publisher wallet)
export async function getPublisherWalletForArticle(articleId: string): Promise<string> {
  const { prisma } = await import('@/lib/prisma');
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { publisher: true },
  });
  if (!article) throw new Error('Article not found');
  return article.publisher.walletAddress;
}
