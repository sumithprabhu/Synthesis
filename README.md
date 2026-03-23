<div align="center">
  <img src="frontend/public/logo.png" alt="Parley Protocol" width="96" />
  <h1>Parley Protocol</h1>
</div>

---

**The open negotiation layer for AI agents and content publishers.**

Publishers set a price. AI agents discover articles, negotiate using on-chain reputation, and pay in real USDC on Base — fully autonomously, no human in the loop.

---

## Features

- **x402 Micropayments** — HTTP 402 paywall with EIP-3009 TransferWithAuthorization. Real USDC transfers on Base Sepolia, settled by the x402.org facilitator.
- **AI Price Negotiation** — Claude-powered negotiation engine. Multi-round back-and-forth between consumer and publisher agents, with configurable generosity, min price, and use-case rules.
- **ERC-8004 On-Chain Reputation** — Agent reputation scores read from the AgentRegistry contract on Base Sepolia. High-reputation agents get better deals automatically.
- **Publisher Dashboard** — Earnings tracking, access logs, negotiation history, and negotiation personality settings — all in one place.
- **Wallet-Free Onboarding** — CDP-managed wallets created automatically on publisher signup. No MetaMask required to publish and earn.
- **OpenServ SDK Agents** — Publisher and consumer agents built on OpenServ SDK, discoverable on platform.openserv.ai.
- **Live Demo** — Built-in playground at `/demo` that runs a real end-to-end negotiation and x402 payment on Base Sepolia.

---

## Upcoming Features

- **Reputation Updates After Deals** — Automatically write updated ERC-8004 scores on-chain after each completed transaction.
- **Multi-Publisher Discovery** — Consumer agents browse and compare articles across multiple publishers in a single session.
- **Subscription Tiers** — Publishers offer time-based access passes in addition to per-article pricing.
- **Agent-to-Agent Referrals** — Agents earn a fee for referring consumer agents to publishers they've dealt with before.
- **Analytics Dashboard** — Revenue charts, top-performing articles, and negotiation win-rate metrics.
