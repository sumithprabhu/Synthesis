# ContentAgents — System Workflow

ContentAgents is an AI-native content marketplace where **publisher agents** and **consumer agents** negotiate access to premium articles autonomously using on-chain identity (ERC-8004), x402 micropayments, and CDP-managed wallets on Base Sepolia.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Consumer["🤖 Consumer Agent (demoConsumer.ts)"]
        CA[CDP Wallet\nBase Sepolia]
    end

    subgraph Frontend["🖥️ Next.js API (frontend/)"]
        API_CONTENT[GET /api/content]
        API_NEGOTIATE[POST /api/agent/negotiate]
        API_CONTENT_ID[GET /api/content/:id\nx402 gate]
        API_REGISTER[POST /api/agent/register]
        API_PUB_REG[POST /api/publisher/register]
        API_DASH[GET /api/dashboard]
        NEG_ENGINE[NegotiationEngine\nlib/negotiation/engine.ts]
    end

    subgraph DB["🗄️ SQLite Database"]
        T_PUB[(Publisher)]
        T_ART[(Article)]
        T_NEG[(NegotiationSession)]
        T_LOG[(AccessLog)]
    end

    subgraph Chain["⛓️ Base Sepolia"]
        CONTRACT[AgentRegistry.sol\nERC-8004 Identity + Reputation]
        USDC[USDC Token]
    end

    subgraph External["🌐 External Services"]
        CDP[Coinbase Developer\nPlatform CDP]
        X402[x402 Facilitator\nx402.org/facilitator]
        OPENSERV[OpenServ\nAgent Orchestration]
    end

    CA -->|1 fetch articles| API_CONTENT
    API_CONTENT -->|query| T_ART
    CA -->|2 negotiate| API_NEGOTIATE
    API_NEGOTIATE --> NEG_ENGINE
    NEG_ENGINE -->|read reputation| CONTRACT
    NEG_ENGINE -->|save rounds| T_NEG
    CA -->|3 pay USDC| USDC
    CA -->|4 present payment-signature| API_CONTENT_ID
    API_CONTENT_ID -->|verify payment| X402
    API_CONTENT_ID -->|write| T_LOG
    CA -->|register identity| API_REGISTER
    API_REGISTER -->|on-chain tx| CONTRACT
    API_PUB_REG -->|create wallet| CDP
    API_PUB_REG -->|save| T_PUB
    API_DASH -->|read all| DB
    OPENSERV -->|webhook| Frontend
```

---

## End-to-End Request Flow

```mermaid
sequenceDiagram
    actor C as Consumer Agent
    participant API as Next.js API
    participant DB as SQLite DB
    participant Chain as Base Sepolia
    participant X402 as x402 Facilitator

    C->>API: GET /api/content
    API->>DB: article.findMany()
    DB-->>API: [{id, title, basePrice, ...}]
    API-->>C: article list

    loop Negotiation (up to 5 rounds)
        C->>API: POST /api/agent/negotiate\n{articleId, consumerAddress, offer}
        API->>Chain: getReputation(consumerAddress)
        Chain-->>API: {score, totalDeals}
        API->>API: calc fairPrice\n= basePrice × quality × repMultiplier
        API->>DB: upsert NegotiationSession
        API-->>C: {decision, counterOffer, reasoning}
    end

    C->>API: GET /api/content/:id
    API-->>C: 402 Payment Required\n{accepts:[{payTo, amount, asset}]}

    C->>Chain: transfer USDC → publisher wallet

    C->>API: GET /api/content/:id\n+ payment-signature header
    API->>X402: POST /verify\n{paymentPayload, requirements}
    X402-->>API: {verified: true}
    API->>DB: AccessLog.create()
    API-->>C: {title, content} ✓
```

---

## Negotiation Algorithm

```mermaid
flowchart TD
    START([Consumer sends offer]) --> LOOKUP[Lookup ERC-8004\nreputation score]
    LOOKUP --> CALC["Calc fairPrice\n= basePrice × quality/5\n× 1-generosity/20\n× repMultiplier"]

    CALC --> REP{Rep score?}
    REP -->|"> 70 trusted"| M1["× 0.8 discount"]
    REP -->|"40–70 neutral"| M2["× 1.0"]
    REP -->|"< 40 risky"| M3["× 1.5 premium"]
    REP -->|"not registered"| M4["× 1.2 unknown"]

    M1 & M2 & M3 & M4 --> CHECK{offer vs fairPrice}

    CHECK -->|"offer ≥ fairPrice"| ACCEPT([✅ Accept\nreturn agreed price])
    CHECK -->|"offer ≥ fairPrice × 0.6"| COUNTER([🔄 Counter\nat fairPrice])
    CHECK -->|"offer < fairPrice × 0.6"| ROUNDS{rounds < 5?}

    ROUNDS -->|yes| COUNTER2([🔄 Counter\nat fairPrice])
    ROUNDS -->|no| REJECT([❌ Reject\nmax rounds reached])
```

---

## Component Map

```mermaid
graph LR
    subgraph Contracts["contracts/"]
        SOL[AgentRegistry.sol\nERC-8004 registry]
        DEPLOY_JS[scripts/deploy.js]
        HC[hardhat.config.ts]
    end

    subgraph FE["frontend/"]
        subgraph Pages["app/ (Next.js pages)"]
            PG_HOME[page.tsx\nlanding]
            PG_DASH[dashboard/page.tsx\nmetrics]
            PG_PUB[publish/page.tsx\nupload UI]
        end

        subgraph Routes["app/api/ (route handlers)"]
            R_CONTENT[content/\nGET list + GET :id x402]
            R_NEG[agent/negotiate/]
            R_REG[agent/register/]
            R_PUBREG[publisher/register/]
            R_DASH[dashboard/]
            R_WH[webhook/openserv/]
        end

        subgraph Lib["lib/ (core logic)"]
            L_CDP[cdp/\nwallet helpers]
            L_ERC[erc8004/registry.ts\nviem on-chain calls]
            L_ENG[negotiation/engine.ts\nprice logic]
            L_PRI[prisma.ts\nDB client]
        end

        subgraph Agents["agents/"]
            A_PUB[publisherAgent.ts]
            A_NEG[capabilities/negotiatePrice.ts]
            A_REP[capabilities/checkReputation.ts]
            A_EVAL[capabilities/evaluateContent.ts]
            A_UPD[capabilities/updateReputation.ts]
        end

        subgraph Scripts["scripts/"]
            S_DEMO[demoConsumer.ts\ne2e demo]
            S_DEP[deployContract.ts\nCDP deploy]
        end

        subgraph Prisma["prisma/"]
            PR_SCH[schema.prisma]
            PR_SEED[seed.ts]
        end
    end

    Routes --> Lib
    Agents --> Lib
    Scripts --> Lib
    Lib --> L_ERC
    L_ERC --> SOL
```

---

## Data Model

```mermaid
erDiagram
    Publisher {
        string id PK
        string email
        string name
        string walletAddress
        string cdpWalletId
        string agentId
        string erc8004Id
        int generosity
        float minPrice
        float reputationThreshold
        float earnings
    }

    Article {
        string id PK
        string title
        string content
        string summary
        string tier
        float basePrice
        float qualityScore
        string publisherId FK
    }

    NegotiationSession {
        string id PK
        string articleId FK
        string consumerAddress
        string status
        float initialPrice
        float finalPrice
        string rounds
        datetime createdAt
    }

    AccessLog {
        string id PK
        string articleId FK
        string consumerAgent
        float pricePaid
        int negotiationRounds
        string txHash
        datetime createdAt
    }

    Publisher ||--o{ Article : publishes
    Article ||--o{ AccessLog : "accessed via"
    Article ||--o{ NegotiationSession : "negotiated for"
```

---

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `CDP_API_KEY_NAME` | Coinbase Developer Platform API key ID |
| `CDP_API_KEY_PRIVATE_KEY` | CDP API secret for managed wallet signing |
| `OPENAI_API_KEY` | OpenAI for content quality scoring |
| `OPENSERV_API_KEY` | OpenServ agent orchestration |
| `AGENT_REGISTRY_CONTRACT` | Deployed ERC-8004 contract on Base Sepolia |
| `X402_FACILITATOR_URL` | x402 payment verifier endpoint |
| `DATABASE_URL` | SQLite file path (`file:./dev.db`) |
| `NEXT_PUBLIC_BASE_RPC` | Base Sepolia RPC URL |

---

## Run Commands

```bash
# Start dev server
cd frontend && npm run dev

# Run end-to-end demo
cd frontend && npm run demo

# Deploy contract (Hardhat)
cd contracts && PRIVATE_KEY=<key> npm run deploy

# Seed database
cd frontend && npm run db:seed

# Type check
cd frontend && npx tsc --noEmit

# Production build
cd frontend && npm run build
```
