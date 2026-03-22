# ContentAgents

**The Negotiating Web** — A gated content marketplace where AI agents autonomously discover, negotiate, and pay for articles using x402 micropayments on Base Sepolia.

**Live demo:** https://frontend-one-orpin-69.vercel.app

---

## Architecture

```mermaid
graph TD
    subgraph "Base Sepolia (on-chain)"
        ERC8004["ERC-8004 AgentRegistry\n0xb0088...D305"]
        USDC["USDC\n0x036C...F7e"]
        FACILITATOR["x402.org Facilitator\n(verifies + settles)"]
    end

    subgraph "ContentAgents Platform (Vercel)"
        CONTENT_API["/api/content/[id]\n402 → verify → settle"]
        NEG_API["/api/agent/negotiate\nClaude AI negotiation"]
        DASH_API["/api/dashboard\nPublisher stats"]
        DB[(MongoDB Atlas)]
    end

    subgraph "Publisher Agent (OpenServ SDK)"
        PUB_AGENT["Publisher Agent\nport 7378"]
        CAP1["negotiate_access"]
        CAP2["check_reputation"]
        CAP3["evaluate_content"]
        CAP4["update_reputation"]
        PUB_AGENT --> CAP1 & CAP2 & CAP3 & CAP4
    end

    subgraph "Consumer Agent (OpenServ SDK)"
        CON_AGENT["Consumer Agent\nport 7379"]
        CAP5["browse_articles"]
        CAP6["negotiate_content_access"]
        CAP7["purchase_content (x402)"]
        CAP8["autonomous_content_purchase"]
        CON_AGENT --> CAP5 & CAP6 & CAP7 & CAP8
    end

    CAP2 -->|readContract| ERC8004
    CAP4 -->|writeContract| ERC8004
    CAP1 --> NEG_API
    CAP7 --> CONTENT_API
    CONTENT_API -->|verify + settle| FACILITATOR
    FACILITATOR -->|transferWithAuthorization| USDC
    CONTENT_API --> DB
    NEG_API --> DB
    DASH_API --> DB
```

---

## x402 Payment Flow

```mermaid
sequenceDiagram
    participant CA as Consumer Agent
    participant API as /api/content/[id]
    participant FAC as x402.org Facilitator
    participant USDC as USDC (Base Sepolia)
    participant DB as MongoDB

    CA->>API: GET /api/content/{id}
    API-->>CA: 402 Payment Required\n{ x402Version:1, accepts:[{ network:"base-sepolia",\n  asset:"0x036C...", maxAmountRequired:"1000",\n  payTo:"0xPublisher...", extra:{name:"USDC",version:"2"} }] }

    Note over CA: ExactEvmSchemeV1<br/>signs EIP-3009 TransferWithAuthorization<br/>(EIP-712 typed data)

    CA->>API: GET /api/content/{id}\nX-PAYMENT: base64(payload)

    API->>FAC: verify(payload, requirements)
    FAC-->>API: { isValid: true }

    API->>FAC: settle(payload, requirements)
    FAC->>USDC: transferWithAuthorization(from, to, value, ...)
    USDC-->>FAC: tx confirmed
    FAC-->>API: { success: true, transaction: "0x..." }

    API->>DB: AccessLog.create({ txHash, pricePaid })
    API-->>CA: 200 { content, title, txHash }
```

---

## Negotiation Flow

```mermaid
sequenceDiagram
    participant CON as Consumer Agent
    participant NEG as /api/agent/negotiate
    participant ENGINE as Negotiation Engine (Claude AI)
    participant ERC as ERC-8004 Registry
    participant DB as MongoDB

    CON->>NEG: POST { articleId, consumerAddress,\n offer: 0.0005, useCase: "research" }
    NEG->>DB: find article + publisher settings
    NEG->>ERC: getReputation(consumerAddress)
    ERC-->>NEG: { score: 50, totalDeals: 0 }

    Note over ENGINE: Applies reputation multiplier\n(score 50 → 0% discount)\nChecks use-case keywords\n(research → free/discount)

    ENGINE->>DB: NegotiationSession.create/update

    alt use-case keyword match
        NEG-->>CON: { decision:"accept", price:0, agreed:true }
    else offer ≥ minPrice
        NEG-->>CON: { decision:"accept", price:offer, agreed:true }
    else offer < minPrice
        NEG-->>CON: { decision:"counter", price:minPrice, agreed:false }
    end
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | MongoDB Atlas via Prisma |
| Agents | OpenServ SDK v2.4.1 (Publisher + Consumer) |
| Payments | x402 v1 — `@x402/fetch`, `@x402/evm/v1`, `x402/verify` |
| Payment settlement | x402.org facilitator → EIP-3009 `transferWithAuthorization` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia) |
| Identity | ERC-8004 AgentRegistry `0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305` |
| Chain | Base Sepolia (chain ID 84532) |
| Hosting | Vercel |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# Database
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/contentagents"

# Auth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Blockchain
NEXT_PUBLIC_BASE_RPC="https://sepolia.base.org"
AGENT_REGISTRY_CONTRACT="0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305"

# CDP (Coinbase Developer Platform — for publisher managed wallets)
CDP_API_KEY_NAME="<your-cdp-key-name>"
CDP_API_KEY_PRIVATE_KEY="<your-cdp-private-key>"

# x402
X402_FACILITATOR_URL="https://x402.org/facilitator"

# Consumer wallet (for x402 payments — use a funded Base Sepolia wallet)
DEMO_PRIVATE_KEY="<hex private key, no 0x prefix>"
CONSUMER_PRIVATE_KEY="<hex private key, no 0x prefix>"

# AI (for negotiation engine)
OPENAI_API_KEY="sk-..."

# OpenServ (optional — for cloud agent tunnel)
OPENSERV_API_KEY="<agent API key from platform.openserv.ai>"
OPENSERV_CONSUMER_API_KEY="<consumer agent API key>"
```

### 3. Database setup

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run

```bash
npm run dev          # Next.js on http://localhost:3000
```

---

## Agent Setup

Two agents are included. Each runs as an HTTP server on a local port; the OpenServ tunnel connects them to the cloud.

### Publisher Agent

Handles negotiation, reputation checks, content evaluation.

```bash
npm run agent         # Connect to OpenServ cloud (requires OPENSERV_API_KEY)
npm run agent:local   # Local only, port 7378
```

**Capabilities:**

| Capability | Description |
|---|---|
| `negotiate_access` | Multi-round price negotiation using Claude AI |
| `check_reputation` | Read ERC-8004 score for a wallet address |
| `evaluate_content` | Score article quality 1–10 using LLM |
| `update_reputation` | Write ERC-8004 score after a deal completes |

### Consumer Agent

Browses articles, negotiates, and pays via x402.

```bash
npm run agent:consumer        # Connect to OpenServ cloud (requires OPENSERV_CONSUMER_API_KEY)
npm run agent:consumer:local  # Local only
```

**Capabilities:**

| Capability | Description |
|---|---|
| `browse_articles` | List available articles with prices and previews |
| `check_my_reputation` | Read own ERC-8004 reputation score |
| `negotiate_content_access` | Negotiate price with publisher agent |
| `purchase_content` | Pay via x402 EIP-3009 — real USDC on-chain |
| `autonomous_content_purchase` | Full workflow: browse → negotiate → pay → read |

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/content` | GET | List all published articles |
| `/api/content/[id]` | GET | Get article — returns 402 if unpaid, full content after x402 payment |
| `/api/agent/negotiate` | POST | Agent-to-agent price negotiation |
| `/api/agent/status` | GET | Publisher agent server health + OpenServ connection |
| `/api/publisher/register` | POST | Register new publisher account |
| `/api/publisher/agent/create` | POST | Create OpenServ agent for publisher |
| `/api/auth/login` | POST | Publisher login → JWT |
| `/api/dashboard` | GET | Publisher stats, earnings, negotiations, access logs |

---

## x402 Implementation Details

The content endpoint (`/api/content/[id]`) implements x402 **v1** format:

**402 response body:**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0xPublisherWallet",
    "description": "Access: Article Title",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "USDC", "version": "2" }
  }]
}
```

The `extra.name` and `extra.version` are the EIP-712 domain parameters for the USDC contract on Base Sepolia (`name: "USDC"`, `version: "2"`). These are required by `ExactEvmSchemeV1` to produce a valid `TransferWithAuthorization` signature.

**Consumer client** (`lib/x402/client.ts`) uses:
- `ExactEvmSchemeV1` from `@x402/evm/v1` — creates EIP-3009 authorization
- `wrapFetchWithPaymentFromConfig` from `@x402/fetch` — auto-retries on 402
- `x402Version: 1 as const` in scheme registration

**Server** uses `useFacilitator` from `x402/verify` to call x402.org for verify + settle.

---

## ERC-8004 Registry

Contract deployed on Base Sepolia: `0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305`

```solidity
function register(string name, string metadata) external returns (uint256)
function getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)
function updateReputation(address agent, bool dealSuccess) external
```

Reputation score (0–100) affects negotiated price:
- Score ≥ 80 → 20% discount
- Score ≥ 60 → 10% discount
- Score < 40 → 10% premium

---

## Project Structure

```
app/
  api/
    content/[id]/     # x402 gated content endpoint
    agent/
      negotiate/      # Agent-to-agent negotiation API
      status/         # Agent server health check
    publisher/        # Publisher registration, agent create
    auth/             # JWT login
    dashboard/        # Publisher stats
  articles/           # Articles browse page
  dashboard/          # Publisher dashboard
  login/              # Publisher login

agents/
  index.ts            # Publisher agent entry point
  consumer-index.ts   # Consumer agent entry point
  publisherAgent.ts   # Publisher agent with 4 capabilities
  consumerAgent.ts    # Consumer agent with 5 capabilities
  capabilities/       # Shared capability implementations

lib/
  x402/client.ts      # x402 consumer client (ExactEvmSchemeV1)
  erc8004/registry.ts # ERC-8004 viem client
  negotiation/engine.ts # Claude AI negotiation engine
  cdp/                # Coinbase CDP wallet management
  prisma.ts           # Prisma client singleton

prisma/
  schema.prisma       # MongoDB schema
  seed.ts             # Demo seed data

contracts/
  AgentRegistry.sol   # ERC-8004 registry contract

scripts/
  e2e-test.ts         # Full end-to-end test (on-chain)
  deployContract.ts   # Deploy AgentRegistry to Base Sepolia
  demoConsumer.ts     # Demo consumer flow
```

---

## On-chain Proof (Base Sepolia)

- **AgentRegistry:** https://sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305
- **USDC:** https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **Example x402 settlement tx:** https://sepolia.basescan.org/tx/0xde3dbeefa8b0caed96d39327ec8479051a258b63168a0d9986ebedcf8af8bde6
