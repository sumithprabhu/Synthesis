# ContentAgents

**The Negotiating Web** — Publishers get paid, agents get content. Autonomous AI agents negotiate content access in real time using x402 micropayments on Base and ERC-8004 onchain identity.

## Repository layout

- **`frontend/`** — Next.js app (dashboard, publish, API routes), OpenServ publisher agent, Prisma, x402 content route, negotiate API.
- **`contracts/`** — Hardhat project; `AgentRegistry.sol` for Base Sepolia (ERC-8004–style registry).

## Quick start

### Contracts (compile / deploy)

```bash
cd contracts
npm install
npx hardhat compile
# Deploy to Base Sepolia (set PUBLISHER_WALLET_PRIVATE_KEY in env):
npx hardhat run scripts/deploy.js --network base-sepolia
```

Or deploy from the frontend using viem (writes `AGENT_REGISTRY_CONTRACT` to `frontend/.env.local`):

```bash
cd frontend
npm run deploy:contract
```

(Requires `contracts/` to be compiled first so the artifact exists.)

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # edit with keys, DATABASE_URL, AGENT_REGISTRY_CONTRACT
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

See **`frontend/README.md`** for full setup, env vars, and scripts.

## How it works

```
Consumer Agent                    Publisher Agent (API)           Base Sepolia
──────────────                    ─────────────────────           ────────────
Create CDP wallet
        │
        ▼
Register on ERC-8004 ────────────────────────────────────────► AgentRegistry.sol
        │
        ▼
Fetch articles  ◄──────────────── GET /api/content
        │
        ▼
Negotiate price ◄──────────────── POST /api/agent/negotiate
   (loop up to 5 rounds)          • checks ERC-8004 reputation
                                  • counters based on quality + rep score
        │ (price agreed)
        ▼
Pay via x402    ──────────────────────────────────────────────► USDC transfer
        │
        ▼
GET /api/content/:id              verify payment via x402.org/facilitator
   + payment-signature  ─────────► serve article content
                                   write AccessLog to DB
```

> See **[workflow.md](./workflow.md)** for the full architecture diagram, component map, negotiation algorithm, and data flow.

## Tech stack

- **Frontend:** Next.js 14, TypeScript, Tailwind, Prisma (SQLite), OpenServ SDK, x402 (payment verification in Route Handler), viem (ERC-8004).
- **Contracts:** Solidity 0.8.20, Hardhat, Base Sepolia.
