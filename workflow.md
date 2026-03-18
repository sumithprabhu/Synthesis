# ContentAgents — System Workflow

ContentAgents is an AI-native content marketplace where **publisher agents** and **consumer agents** negotiate access to premium articles autonomously using on-chain identity (ERC-8004), x402 micropayments, and CDP-managed wallets on Base Sepolia.

---

## 1. Full System Architecture

```mermaid
graph TB
    subgraph PUB["👤 Publisher (Human)"]
        P1["/api/publisher/register\nCreate account + CDP wallet"]
        P2["/api/publisher/agent/create\n⚠️ Required before publishing"]
        P3["/publish\nUpload content"]
        P4["/dashboard\nMetrics + Agent Settings"]
    end

    subgraph PAGENT["🤖 Publisher Agent (OpenServ)"]
        PA[publisherAgent.ts]
        CAP_NEG[negotiate_access]
        CAP_REP[check_reputation]
        CAP_EVAL[evaluate_content]
        CAP_UPD[update_reputation]
        PA --> CAP_NEG & CAP_REP & CAP_EVAL & CAP_UPD
    end

    subgraph CAGENT["🤖 Consumer Agent"]
        CA_WALLET[Viem wallet\nDEMO_PRIVATE_KEY]
        CA_LOGIC[Negotiate + useCase\n+ x402 payment]
    end

    subgraph API["🖥️ Next.js API Routes"]
        R1["POST /api/publisher/register"]
        R2["POST /api/publisher/agent/create\nRegisters on OpenServ"]
        R3["PUT /api/publisher/settings\nTune agent parameters"]
        R4["POST /api/content\nPublish article"]
        R5["GET /api/content\nList with previews"]
        R6["GET /api/content/:id\n🔒 x402 or 🆓 free"]
        R7["POST /api/agent/negotiate\n+ useCase field"]
        R8["POST /api/agent/register\nERC-8004 on-chain"]
        R9["GET /api/dashboard"]
    end

    subgraph DB["🍃 MongoDB Atlas"]
        M_PUB[("Publisher\n+ agent settings\n+ free-access rules")]
        M_ART[("Article\n+ previewLength\n+ isFree")]
        M_NEG[("NegotiationSession\nrounds as JSON")]
        M_LOG[("AccessLog")]
    end

    subgraph CHAIN["⛓️ Base Sepolia"]
        CONTRACT["AgentRegistry.sol\nERC-8004"]
        USDC["USDC Token"]
    end

    subgraph EXT["🌐 External"]
        CDP["Coinbase CDP\nManaged Wallets"]
        X402["x402 Facilitator\nx402.org/facilitator"]
        OPENSERV["OpenServ Platform\napi.openserv.ai/agents"]
    end

    P1 --> R1 --> CDP --> M_PUB
    P2 --> R2 --> OPENSERV --> M_PUB
    P4 --> R3 --> M_PUB
    P3 --> R4 --> M_ART

    OPENSERV -->|webhook| PAGENT --> API
    CA_WALLET --> R8 --> CONTRACT
    CA_LOGIC --> R5 --> M_ART
    CA_LOGIC --> R7 --> M_NEG
    R7 -->|reputation lookup| CONTRACT
    CA_LOGIC --> R6
    R6 -->|verify payment| X402
    R6 -->|free if isFree=true| CA_LOGIC
    R6 --> M_LOG
    R9 --> M_PUB & M_ART & M_NEG & M_LOG
```

---

## 2. Publisher Journey — Full Flow

```mermaid
sequenceDiagram
    actor P as Publisher (Human)
    participant UI as Next.js UI
    participant API as API Routes
    participant CDP as Coinbase CDP
    participant OS as OpenServ
    participant DB as MongoDB
    participant Chain as Base Sepolia

    rect rgb(20, 30, 50)
        Note over P,Chain: STEP 1 — Register
        P->>UI: POST /api/publisher/register\n{name, email, password?}
        UI->>API: request
        API->>CDP: Wallet.create(base-sepolia)
        CDP-->>API: {walletId, address}
        API->>DB: Publisher.create({email, walletAddress,\ncdpWalletId, agentCreated=false})
        API-->>P: {id, walletAddress} ✅
    end

    rect rgb(20, 40, 30)
        Note over P,Chain: STEP 2 — Create OpenServ Agent (mandatory)
        Note over UI: /dashboard shows amber warning\n"Create your agent before publishing"
        P->>UI: Click "Create your agent"
        UI->>API: POST /api/publisher/agent/create
        API->>OS: POST https://api.openserv.ai/agents\n{name, walletAddress}
        OS-->>API: {id: "openserv-agent-xxx"}
        API->>DB: Publisher.update({agentCreated=true,\nopenservAgentId})
        API-->>UI: {openservAgentId} ✅
        Note over UI: Banner turns green — publish form unlocked
    end

    rect rgb(30, 20, 50)
        Note over P,Chain: STEP 3 — Tune Agent Settings
        P->>UI: Open Agent Settings on /dashboard
        Note over UI: generosity, minPrice, reputationThreshold,\nfreeForHighReputation, allowFreeByUseCase,\nfreeCaseKeywords
        P->>UI: Adjust sliders / toggles → Save
        UI->>API: PUT /api/publisher/settings\n{generosity, minPrice, ...}
        API->>DB: Publisher.update(settings)
        API-->>UI: updated settings ✅
    end

    rect rgb(40, 25, 20)
        Note over P,Chain: STEP 4 — Register on ERC-8004 (optional but recommended)
        P->>API: POST /api/agent/register\n{walletId, agentName}
        API->>CDP: loadWallet(walletId)
        CDP-->>API: wallet
        API->>Chain: AgentRegistry.register(agentName)
        Chain-->>API: txHash
        API-->>P: {success, txHash} ✅
    end

    rect rgb(20, 35, 45)
        Note over P,Chain: STEP 5 — Publish Content
        Note over UI: Only available if agentCreated = true
        P->>UI: Fill title, content, tier\nToggle: Free 🆓 or Gated 🔒\nSet preview length (default 300 chars)
        UI->>API: GET /api/dashboard (get publisherId)
        UI->>API: POST /api/content\n{title, content, tier, publisherId,\nisFree, previewLength}
        API->>DB: Article.create({...isFree, previewLength,\nsummary=content.slice(0,120)})
        API-->>UI: {id, qualityScore} ✅
    end

    rect rgb(15, 40, 40)
        Note over P,Chain: STEP 6 — Monitor on Dashboard
        P->>UI: Visit /dashboard
        UI->>API: GET /api/dashboard
        API->>DB: Publisher + Articles + AccessLogs\n+ NegotiationSessions
        API-->>UI: {earnings, negotiations,\napiCalls, stats, reputation}
        Note over UI: See agent creation status, live metrics,\naccepted deals, paid accesses
    end
```

---

## 3. Consumer Journey — Negotiate → Pay → Read

```mermaid
sequenceDiagram
    actor C as Consumer Agent
    participant W as Viem Wallet
    participant API as Next.js API
    participant DB as MongoDB
    participant Chain as Base Sepolia
    participant X402 as x402 Facilitator

    rect rgb(20, 30, 50)
        Note over C,X402: STEP 1 — Identity Setup
        C->>W: privateKeyToAccount(DEMO_PRIVATE_KEY)
        W-->>C: address = 0x0Fe6...
        C->>Chain: AgentRegistry.getReputation(address)
        Chain-->>C: {exists: false}
        C->>Chain: AgentRegistry.register("DemoConsumerAgent")
        Chain-->>C: txHash confirmed ✅
        Note right of Chain: Score starts at 0\nMultiplier = 1.2× (unknown)
    end

    rect rgb(20, 40, 30)
        Note over C,X402: STEP 2 — Discover Content
        C->>API: GET /api/content
        API->>DB: Article.findMany()
        DB-->>API: [{id, title, tier, basePrice,\npreview (first N chars), isFree}]
        API-->>C: article list with free previews
    end

    rect rgb(40, 25, 20)
        Note over C,X402: STEP 3 — Negotiate (smart routing)
        C->>API: POST /api/agent/negotiate\n{articleId, consumerAddress,\noffer, useCase?}

        API->>Chain: getReputation(consumerAddress)
        Chain-->>API: {score, totalDeals, exists}

        alt publisher.freeForHighReputation AND score > 70
            API-->>C: {decision: accept, price: 0,\nreasoning: "Free — high reputation"}
        else publisher.allowFreeByUseCase AND useCase matches keywords
            Note over API: keywords: research, education,\nnonprofit, open-source, ...
            API-->>C: {decision: accept, price: 0,\nreasoning: "Free — qualifying use case"}
        else normal negotiation
            API->>API: fairPrice = basePrice\n  × (qualityScore/5)\n  × (1 − generosity/20)\n  × repMultiplier
            API->>DB: upsert NegotiationSession
            API-->>C: {decision, counterOffer, reasoning}
        end

        loop counter → raise offer 85% each round (max 5)
            C->>API: POST /api/agent/negotiate\n{sessionId, higher offer}
            API-->>C: counter or accept
        end
    end

    rect rgb(30, 20, 50)
        Note over C,X402: STEP 4 — Access Content
        alt article.isFree = true
            C->>API: GET /api/content/:id
            API-->>C: {title, content} ✅ no payment needed
        else price = 0 (free from negotiation)
            C->>API: GET /api/content/:id\n+ x-agreed-price: 0
            API-->>C: {title, content} ✅
        else paid access
            C->>API: GET /api/content/:id (no header)
            API-->>C: 402 Payment Required\n{accepts:[{payTo, amount USDC, network}]}
            C->>Chain: transfer USDC → publisher.walletAddress
            Chain-->>C: payment receipt
            C->>API: GET /api/content/:id\n+ payment-signature header
            API->>X402: POST /verify {paymentPayload}
            X402-->>API: {verified: true}
            API->>DB: AccessLog.create({pricePaid, txHash})
            API-->>C: {title, content} ✅
        end
    end

    rect rgb(15, 40, 40)
        Note over C,X402: STEP 5 — Reputation Update
        API->>Chain: AgentRegistry.updateReputation\n(consumerAddr, dealSuccess=true)
        Chain-->>API: txHash
        Note right of Chain: Score increases → better\ndeals / free access next time
    end
```

---

## 4. Negotiation Decision Tree

```mermaid
flowchart TD
    START([Consumer sends negotiate request]) --> LOAD[Load Article + Publisher settings]
    LOAD --> GETREP[Read ERC-8004 reputation from chain]

    GETREP --> FREE1{freeForHighReputation\nAND score > 70?}
    FREE1 -->|yes| GRANT_REP(["✅ ACCEPT — price = $0\nReason: high reputation score"])

    FREE1 -->|no| FREE2{allowFreeByUseCase\nAND useCase provided?}
    FREE2 -->|yes| KEYWORD{useCase contains\na freeCaseKeyword?}
    KEYWORD -->|yes| GRANT_UC(["✅ ACCEPT — price = $0\nReason: qualifying use case"])
    KEYWORD -->|no| PRICING
    FREE2 -->|no| PRICING

    PRICING[Calculate fair price]
    PRICING --> MULT{Reputation score}
    MULT -->|"> 70 trusted"| M1["× 0.8\nloyalty discount"]
    MULT -->|"40–70 neutral"| M2["× 1.0"]
    MULT -->|"< 40 risky"| M3["× 1.5\nrisk premium"]
    MULT -->|"not registered"| M4["× 1.2\nunknown premium"]

    M1 & M2 & M3 & M4 --> FORMULA["fairPrice =\nbasePrice × (quality/5)\n× (1 − generosity/20)\n× repMultiplier"]

    FORMULA --> CMP{Compare offer}
    CMP -->|"offer ≥ fairPrice"| ACC(["✅ ACCEPT at offer price"])
    CMP -->|"fairPrice×0.6 ≤ offer < fairPrice"| CNT(["🔄 COUNTER at fairPrice"])
    CMP -->|"offer < fairPrice × 0.6"| ROUNDS{rounds ≥ 5?}
    ROUNDS -->|no| CNT2(["🔄 COUNTER at fairPrice"])
    ROUNDS -->|yes| REJ(["❌ REJECT — max rounds"])
```

---

## 5. Content Visibility Model

```mermaid
flowchart LR
    subgraph Article["Article on platform"]
        META["Metadata\ntitle, tier, basePrice"]
        PREV["Preview\nfirst N chars\n(previewLength, default 300)"]
        FULL["Full content\n🔒 gated or 🆓 free"]
    end

    subgraph Access["Who sees what"]
        ANY["Anyone\nGET /api/content"]
        NEG["Negotiated consumer\nPOST /api/agent/negotiate"]
        PAY["Paying consumer\nGET /api/content/:id + payment"]
        FREE_C["Free consumer\n(isFree=true OR price=0)"]
    end

    ANY -->|always| META
    ANY -->|always| PREV
    NEG -->|after deal| PAY
    NEG -->|"use case match\nOR high rep"| FREE_C
    FREE_C -->|no payment needed| FULL
    PAY -->|x402 verified| FULL
```

---

## 6. Agent Settings Reference

```mermaid
graph TD
    subgraph Settings["Publisher Agent Settings\n(PUT /api/publisher/settings)"]
        G["generosity (1–10)\nHow willing to discount\nHigher = lower fairPrice"]
        MP["minPrice (USD)\nAbsolute floor — never\ngo below this"]
        RT["reputationThreshold\nMin ERC-8004 score\nfor fee waiver"]
        FHR["freeForHighReputation (bool)\nAuto-grant free access\nif score > 70"]
        FUC["allowFreeByUseCase (bool)\nGrant free if stated\nuse case matches keywords"]
        FCK["freeCaseKeywords (string)\nComma-separated e.g.\nresearch,education,nonprofit"]
    end

    subgraph Effect["Effect on negotiation"]
        G -->|"fairPrice ↓ as generosity ↑"| NE[NegotiationEngine]
        FHR -->|"score > 70 → price = 0"| NE
        FUC & FCK -->|"keyword match → price = 0"| NE
        MP -->|"hard floor on all deals"| NE
        RT -->|"future: waive fees above threshold"| NE
    end
```

---

## 7. OpenServ Agent Capabilities

```mermaid
graph LR
    subgraph Platform["OpenServ Platform"]
        OS[Task dispatcher]
    end

    subgraph Agent["Publisher Agent\npublisherAgent.ts"]
        PROMPT["System: Negotiate fair\ncompensation. Protect\npublisher. Build trust."]
    end

    subgraph Caps["4 Capabilities"]
        C1["negotiate_access\n(articleId, offer, consumerAddress,\nuseCase?)"]
        C2["check_reputation\n(walletAddress)"]
        C3["evaluate_content\n(articleId) → LLM score 1-10"]
        C4["update_reputation\n(publisherId, agentAddress,\ndealSuccess)"]
    end

    subgraph Impl["Implementation"]
        I1["lib/negotiation/engine.ts\nfull pricing + free logic"]
        I2["lib/erc8004/registry.ts\nviem readContract"]
        I3["OpenAI API\nquality scoring"]
        I4["lib/erc8004/registry.ts\nviem writeContract via CDP"]
    end

    OS -->|webhook / task| Agent
    Agent --> Caps
    C1 --> I1
    C2 --> I2
    C3 --> I3
    C4 --> I4
```

---

## 8. Data Model

```mermaid
erDiagram
    Publisher {
        ObjectId id PK
        string email UK
        string name
        string walletAddress UK
        string cdpWalletId
        string openservAgentId
        boolean agentCreated
        int generosity
        float minPrice
        float reputationThreshold
        boolean freeForHighReputation
        boolean allowFreeByUseCase
        string freeCaseKeywords
        float earnings
        datetime createdAt
    }

    Article {
        ObjectId id PK
        string title
        string content
        string summary
        string tier
        float basePrice
        float qualityScore
        int previewLength
        boolean isFree
        ObjectId publisherId FK
        datetime createdAt
    }

    NegotiationSession {
        ObjectId id PK
        string articleId
        string consumerAddress
        string status
        float initialPrice
        float finalPrice
        Json rounds
        datetime createdAt
    }

    AccessLog {
        ObjectId id PK
        ObjectId articleId FK
        string consumerAgent
        float pricePaid
        int negotiationRounds
        string txHash
        datetime createdAt
    }

    Publisher ||--o{ Article : publishes
    Article ||--o{ AccessLog : "paid access"
    Article ||--o{ NegotiationSession : "negotiated for"
```

---

## 9. Component Map

```mermaid
graph TD
    subgraph Root["Synthesis/"]
        subgraph Contracts["contracts/"]
            SOL["AgentRegistry.sol\nERC-8004 identity + reputation"]
            DJ["scripts/deploy.js"]
        end

        subgraph FE["frontend/"]
            subgraph Pages["app/ — UI"]
                PG1["/ — landing"]
                PG2["/dashboard\n• Agent creation card\n• Agent settings form\n• Metrics + negotiations"]
                PG3["/publish\n• Agent check gate\n• Free/Gated toggle\n• previewLength input\n• Live preview box"]
            end

            subgraph Routes["app/api/"]
                RT1["publisher/register — POST"]
                RT2["publisher/agent/create — POST ⭐ new"]
                RT3["publisher/settings — PUT ⭐ new"]
                RT4["content/ — GET (with preview) + POST"]
                RT5["content/:id — GET (isFree bypass + x402)"]
                RT6["agent/negotiate — POST (+ useCase)"]
                RT7["agent/register — POST (ERC-8004)"]
                RT8["dashboard — GET"]
                RT9["webhook/openserv — POST"]
            end

            subgraph Lib["lib/"]
                LIB1["negotiation/engine.ts\n⭐ freeForHighRep + useCase logic"]
                LIB2["erc8004/registry.ts\nviem read + write"]
                LIB3["cdp/ — wallet helpers"]
                LIB4["prisma.ts — MongoDB client"]
            end

            subgraph Agents["agents/"]
                AG1["publisherAgent.ts\n4 capabilities"]
                AG2["capabilities/*"]
            end

            subgraph Scripts["scripts/"]
                SC1["demoConsumer.ts\nviem wallet + useCase demo"]
            end
        end
    end
```

---

## 10. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `CDP_API_KEY_NAME` | `lib/cdp/config.ts` | Coinbase CDP API key ID |
| `CDP_API_KEY_PRIVATE_KEY` | `lib/cdp/config.ts` | CDP API secret (base64 Ed25519) |
| `CDP_WALLET_SECRET` | `@coinbase/cdp-sdk` v1 | Wallet encryption secret (CDP Portal → Settings → Wallet Secrets) |
| `DEMO_PRIVATE_KEY` | `scripts/demoConsumer.ts` | Funded Base Sepolia key for demo consumer wallet |
| `OPENAI_API_KEY` | `agents/capabilities/evaluateContent.ts` | Content quality scoring via LLM |
| `OPENSERV_API_KEY` | `app/api/publisher/agent/create` | Register publisher agent on OpenServ |
| `AGENT_REGISTRY_CONTRACT` | `lib/erc8004/registry.ts` | Deployed AgentRegistry address on Base Sepolia |
| `X402_FACILITATOR_URL` | `app/api/content/[id]/route.ts` | Payment verification endpoint |
| `DATABASE_URL` | `lib/prisma.ts` | MongoDB Atlas connection string |
| `NEXT_PUBLIC_BASE_RPC` | `lib/erc8004/registry.ts` | Base Sepolia RPC URL |
| `NEXTAUTH_SECRET` | NextAuth | Session signing secret |
| `NEXTAUTH_URL` | NextAuth | App base URL (`http://localhost:3000`) |

---

## 11. Run Commands

```bash
# ── Contracts ──────────────────────────────────────────────────
cd contracts
PRIVATE_KEY=<funded_key> npm run deploy    # deploy AgentRegistry to Base Sepolia

# ── Frontend setup ─────────────────────────────────────────────
cd frontend
npm install
cp .env.local.example .env.local           # fill in all credentials
npx prisma generate                         # generate MongoDB Prisma client
npx prisma db push                          # create collections + indexes in MongoDB
npm run db:seed                             # seed demo publisher (needs CDP)

# ── Dev ────────────────────────────────────────────────────────
npm run dev                                 # → http://localhost:3000
npm run demo                                # run full consumer demo (uses DEMO_PRIVATE_KEY)
npm run agent                               # start OpenServ publisher agent server

# ── Quality ────────────────────────────────────────────────────
npx tsc --noEmit                            # type check (0 errors)
npm run build                               # production build
npx prisma studio                           # MongoDB GUI in browser
```

---

## 12. Publisher Onboarding Checklist

```mermaid
graph LR
    S1["1️⃣ Register\n/api/publisher/register\nCDP wallet auto-created"] -->
    S2["2️⃣ Create OpenServ Agent\n/dashboard → Create your agent\n⚠️ Required before publishing"] -->
    S3["3️⃣ Tune Agent Settings\n/dashboard → Agent Settings\ngenerosity, free rules, keywords"] -->
    S4["4️⃣ Register on ERC-8004\nOn-chain identity for\nreputation tracking"] -->
    S5["5️⃣ Publish Content\n/publish\nFree or Gated, set preview"] -->
    S6["6️⃣ Earn & Monitor\n/dashboard\nNegotiations, API calls, earnings"]
```
