# ContentAgents Frontend

**The Negotiating Web** — Publishers get paid, agents get content. Autonomous AI agents negotiate content access in real time using x402 micropayments on Base and ERC-8004 onchain identity.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind
- **Backend:** Next.js API routes, Prisma, SQLite
- **Agents:** OpenServ TypeScript SDK
- **Payments:** x402 (Base Sepolia, USDC)
- **Identity:** ERC-8004 mock registry on Base Sepolia

## Setup

1. **Install and generate Prisma**

   ```bash
   npm install
   npx prisma generate
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set:

   - `DATABASE_URL="file:./dev.db"`
   - `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL=http://localhost:3000`
   - `OPENSERV_API_KEY` (from OpenServ platform)
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (for content evaluation)
   - `NEXT_PUBLIC_BASE_RPC="https://sepolia.base.org"`
   - `AGENT_REGISTRY_CONTRACT` — deploy with `npm run deploy:contract` (uses CDP wallet; no private keys)
   - `CDP_API_KEY_NAME` and `CDP_API_KEY_PRIVATE_KEY` — Coinbase Developer Platform API key (for managed wallets; never store wallet private keys)

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run app**

   ```bash
   npm run dev
   ```

   Then open http://localhost:3000.

## Deploy AgentRegistry (Base Sepolia)

**Do not deploy without reviewing the contract.**

The contract is in `contracts/AgentRegistry.sol`. It is a simple ERC-8004–style mock registry:

- `register(agentName)` — register `msg.sender` with reputation 50, 0 deals.
- `getReputation(agent)` — returns `(score, totalDeals, exists)`.
- `updateReputation(agent, dealSuccess)` — +2 score on success, −5 on failure; increments `totalDeals`.

Deploy with Foundry or Hardhat to Base Sepolia (chain ID 84532), then set `AGENT_REGISTRY_CONTRACT` in `.env.local`.

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Next.js dev server                   |
| `npm run agent`| OpenServ publisher agent (tunnel)     |
| `npm run demo` | Demo consumer: register → negotiate → fetch |
| `npm run db:seed` | Seed demo publisher                 |

## Project layout

- `app/` — Next.js pages and API routes (auth, content, agent negotiate/register, webhook)
- `agents/` — OpenServ publisher agent and capabilities (negotiate_access, check_reputation, evaluate_content, update_reputation)
- `lib/` — x402 config, ERC-8004 registry (viem), negotiation engine, Prisma client
- `prisma/` — schema and seed
- `contracts/` — AgentRegistry.sol for Base Sepolia
- `scripts/demoConsumer.ts` — end-to-end demo script
- `agent.json` / `agent_log.json` — hackathon manifest and execution log

## Flow

1. Publisher signs up, uploads articles, sets agent personality (generosity, min price, reputation threshold).
2. Platform runs a Publisher Agent (OpenServ) per publisher.
3. Consumer agent requests an article; publisher agent checks ERC-8004 reputation and quotes a price.
4. Negotiation (up to 5 rounds); on accept, consumer pays via x402 USDC on Base Sepolia.
5. Content is served; AccessLog and ERC-8004 reputation are updated.
