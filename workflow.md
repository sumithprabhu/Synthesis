# ContentAgents — System Workflow

ContentAgents is an AI-native content marketplace where **publisher agents** and **consumer agents** negotiate access to premium articles autonomously using on-chain identity (ERC-8004), x402 micropayments, and CDP-managed wallets on Base Sepolia.

---

## 1. Full System Architecture

```mermaid
graph TB
    subgraph PUB["👤 Publisher (Human)"]
        PUI[Register at /api/publisher/register]
        PPAGE[Upload content at /publish]
    end

    subgraph PAGENT["🤖 Publisher Agent (OpenServ)"]
        PA[publisherAgent.ts]
        CAP_NEG[negotiate_access]
        CAP_REP[check_reputation]
        CAP_EVAL[evaluate_content]
        CAP_UPD[update_reputation]
        PA --> CAP_NEG & CAP_REP & CAP_EVAL & CAP_UPD
    end

    subgraph CAGENT["🤖 Consumer Agent (demoConsumer.ts)"]
        CA_WALLET[Viem wallet\nDEMO_PRIVATE_KEY]
        CA_LOGIC[Negotiation loop\n+ x402 payment]
    end

    subgraph API["🖥️ Next.js API Routes"]
        R1[POST /api/publisher/register]
        R2[POST /api/content]
        R3[GET /api/content]
        R4[GET /api/content/:id\n🔒 x402 gate]
        R5[POST /api/agent/negotiate]
        R6[POST /api/agent/register]
        R7[GET /api/dashboard]
    end

    subgraph DB["🍃 MongoDB Atlas"]
        M_PUB[(Publisher)]
        M_ART[(Article)]
        M_NEG[(NegotiationSession)]
        M_LOG[(AccessLog)]
    end

    subgraph CHAIN["⛓️ Base Sepolia"]
        CONTRACT[AgentRegistry.sol\nERC-8004]
        USDC[USDC Token]
    end

    subgraph EXT["🌐 External"]
        CDP[Coinbase CDP\nManaged Wallets]
        X402[x402 Facilitator\nx402.org/facilitator]
        OPENSERV[OpenServ Platform]
    end

    PUI --> R1 --> CDP --> M_PUB
    PPAGE --> R2 --> M_ART
    OPENSERV -->|webhook| API
    PAGENT --> API

    CA_WALLET -->|register| R6 --> CONTRACT
    CA_LOGIC -->|fetch| R3 --> M_ART
    CA_LOGIC -->|negotiate| R5 --> M_NEG
    R5 -->|reputation lookup| CONTRACT
    CA_LOGIC -->|pay + request| R4
    R4 -->|verify payment| X402
    R4 -->|serve content| CA_LOGIC
    R4 --> M_LOG
    R7 --> M_PUB & M_ART & M_NEG & M_LOG
```

---

## 2. Publisher Journey (from zero to earning)

```mermaid
sequenceDiagram
    actor P as Publisher (Human)
    participant UI as Next.js UI
    participant API as API Routes
    participant CDP as Coinbase CDP
    participant DB as MongoDB
    participant Chain as Base Sepolia

    Note over P,Chain: ── STEP 1: Registration ──

    P->>UI: Visit /api/publisher/register
    UI->>API: POST {name, email, password}
    API->>CDP: Wallet.create(base-sepolia)
    CDP-->>API: {walletId, address}
    API->>DB: Publisher.create({email, walletAddress, cdpWalletId})
    DB-->>API: publisher record
    API-->>P: {id, walletAddress, message}

    Note over P,Chain: ── STEP 2: Publish Content ──

    P->>UI: Visit /publish → fill title + content
    UI->>API: GET /api/dashboard (get publisherId)
    API->>DB: Publisher.findFirst()
    DB-->>UI: {publisher.id}
    UI->>API: POST /api/content {title, content, tier, publisherId}
    API->>DB: Article.create({title, content, summary, basePrice})
    DB-->>UI: {id, qualityScore}
    UI-->>P: ✅ Article published

    Note over P,Chain: ── STEP 3: Agent Registration (optional) ──

    P->>API: POST /api/agent/register {walletId, agentName}
    API->>CDP: loadWallet(walletId)
    CDP-->>API: wallet
    API->>Chain: AgentRegistry.register(agentName)
    Chain-->>API: txHash
    API-->>P: {success, txHash}

    Note over P,Chain: ── STEP 4: Earn from deals ──

    Note over DB,Chain: Consumer pays → AccessLog written\nReputation updated on-chain
    P->>UI: Visit /dashboard
    UI->>API: GET /api/dashboard
    API->>DB: Publisher + Articles + AccessLogs + NegotiationSessions
    API-->>UI: {earnings, negotiations, apiCalls, stats}
    UI-->>P: 📊 Metrics dashboard
```

---

## 3. Consumer Journey (negotiate → pay → read)

```mermaid
sequenceDiagram
    actor C as Consumer Agent
    participant Wallet as Viem Wallet\n(DEMO_PRIVATE_KEY)
    participant API as Next.js API
    participant DB as MongoDB
    participant Chain as Base Sepolia
    participant X402 as x402 Facilitator

    Note over C,X402: ── STEP 1: Identity ──

    C->>Wallet: privateKeyToAccount(DEMO_PRIVATE_KEY)
    Wallet-->>C: address = 0x0Fe6...

    C->>Chain: AgentRegistry.getReputation(address)
    Chain-->>C: {exists: false} → not yet registered

    C->>Chain: AgentRegistry.register("DemoConsumerAgent")
    Chain-->>C: txHash confirmed ✅
    Note right of Chain: Reputation score starts at 0\nMultiplier = 1.2x (unknown)

    Note over C,X402: ── STEP 2: Discovery ──

    C->>API: GET /api/content
    API->>DB: Article.findMany()
    DB-->>API: [{id, title, basePrice, tier, ...}]
    API-->>C: article list

    Note over C,X402: ── STEP 3: Negotiation loop ──

    loop Up to 5 rounds
        C->>API: POST /api/agent/negotiate\n{articleId, consumerAddress, offer}
        API->>Chain: getReputation(consumerAddress)
        Chain-->>API: {score, totalDeals, exists}
        API->>API: fairPrice = basePrice × quality/5\n         × (1 - generosity/20)\n         × repMultiplier
        API->>DB: upsert NegotiationSession (rounds as JSON)
        DB-->>API: sessionId
        API-->>C: {decision, counterOffer, reasoning, rounds}

        alt decision = accept
            Note over C: 🎉 Deal agreed at fairPrice
        else decision = counter
            Note over C: Raise offer by 85%, retry
        else decision = reject (max rounds)
            Note over C: ❌ Walk away
        end
    end

    Note over C,X402: ── STEP 4: Payment & Access ──

    C->>API: GET /api/content/:id (no payment header)
    API-->>C: 402 Payment Required\n{accepts:[{payTo, maxAmount, asset: USDC}]}

    C->>Chain: Transfer USDC → publisher.walletAddress
    Chain-->>C: payment receipt / signature

    C->>API: GET /api/content/:id\n+ payment-signature header
    API->>X402: POST /verify {paymentPayload, requirements}
    X402-->>API: {verified: true}
    API->>DB: AccessLog.create({pricePaid, consumerAgent, txHash})
    API-->>C: {title, content} ✅

    Note over C,X402: ── STEP 5: Reputation update ──

    API->>Chain: AgentRegistry.updateReputation(consumerAddr, success=true)
    Chain-->>API: txHash
    Note right of Chain: Consumer score increases\nBetter deals next time!
```

---

## 4. Negotiation Algorithm

```mermaid
flowchart TD
    START([Consumer sends offer]) --> GETART[Load Article\nbasePrice, qualityScore, generosity]
    GETART --> GETREP[Read ERC-8004\nreputation from chain]

    GETREP --> MULT{Reputation score?}
    MULT -->|score > 70\ntrusted| R1["repMult = 0.8x\n(loyalty discount)"]
    MULT -->|score 40–70\nneutral| R2["repMult = 1.0x"]
    MULT -->|score < 40\nrisky| R3["repMult = 1.5x\n(risk premium)"]
    MULT -->|not registered| R4["repMult = 1.2x\n(unknown premium)"]

    R1 & R2 & R3 & R4 --> CALC["fairPrice = basePrice\n× (qualityScore / 5)\n× (1 − generosity / 20)\n× repMult"]

    CALC --> CMP{Compare offer}

    CMP -->|offer ≥ fairPrice| ACC(["✅ ACCEPT\nreturn offer as final price"])
    CMP -->|fairPrice×0.6 ≤ offer < fairPrice| CNT1(["🔄 COUNTER\nat fairPrice"])
    CMP -->|offer < fairPrice×0.6| RNDS{rounds < 5?}

    RNDS -->|yes| CNT2(["🔄 COUNTER\nat fairPrice"])
    RNDS -->|no| REJ(["❌ REJECT\nmax rounds reached"])

    ACC --> SAVE[Save session\nstatus = accepted]
    CNT1 & CNT2 --> SAVE2[Append round to\nNegotiationSession]
    REJ --> SAVE3[Save session\nstatus = rejected]
```

---

## 5. Publisher Agent Capabilities (OpenServ)

```mermaid
graph LR
    subgraph Agent["🤖 Publisher Agent (OpenServ SDK)"]
        PROMPT["System prompt:\nNegotiate fair compensation.\nProtect publisher interests.\nBuild long-term relationships."]
    end

    subgraph Caps["Capabilities"]
        NEG["negotiate_access\narticleId + consumerAddress + offer\n→ decision + counterOffer"]
        REP["check_reputation\nwalletAddress\n→ score + totalDeals + exists"]
        EVAL["evaluate_content\narticleId\n→ qualityScore 1–10 via LLM"]
        UPD["update_reputation\npublisherId + agentAddress + dealSuccess\n→ on-chain tx"]
    end

    subgraph Calls["Underlying calls"]
        E1[negotiation/engine.ts]
        E2[erc8004/registry.ts\nreadContract via viem]
        E3[OpenAI API\ncontent scoring]
        E4[erc8004/registry.ts\nwriteContract via CDP wallet]
    end

    Agent --> Caps
    NEG --> E1
    REP --> E2
    EVAL --> E3
    UPD --> E4

    OPENSERV[OpenServ Platform] -->|webhook / task| Agent
```

---

## 6. Data Model

```mermaid
erDiagram
    Publisher {
        ObjectId id PK
        string email UK
        string name
        string walletAddress UK
        string cdpWalletId
        string agentId
        string erc8004Id
        int generosity
        float minPrice
        float reputationThreshold
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

## 7. Component Map

```mermaid
graph TD
    subgraph Root["Synthesis/"]
        subgraph Contracts["contracts/"]
            SOL["AgentRegistry.sol\nERC-8004 identity + reputation"]
            DJ["scripts/deploy.js\nnpx hardhat deploy --network base-sepolia"]
            HC["hardhat.config.ts\nreads PRIVATE_KEY env"]
        end

        subgraph FE["frontend/"]
            subgraph Pages["app/ — UI Pages"]
                PG1["/ — landing"]
                PG2["/dashboard — publisher metrics"]
                PG3["/publish — upload content"]
            end

            subgraph Routes["app/api/ — Route Handlers"]
                RT1["content/ → GET list + POST create + GET :id x402"]
                RT2["agent/negotiate/ → POST"]
                RT3["agent/register/ → POST"]
                RT4["publisher/register/ → POST + CDP wallet"]
                RT5["dashboard/ → GET aggregated metrics"]
                RT6["webhook/openserv/ → POST"]
            end

            subgraph Lib["lib/ — Core Logic"]
                LIB1["cdp/config.ts — Coinbase.configure()"]
                LIB2["cdp/wallet.ts — createWallet / loadWallet"]
                LIB3["erc8004/registry.ts — viem read + write contract"]
                LIB4["erc8004/abi.ts — AgentRegistry ABI"]
                LIB5["negotiation/engine.ts — price algorithm"]
                LIB6["prisma.ts — MongoDB client singleton"]
            end

            subgraph Agents["agents/ — OpenServ Agent"]
                AG1["publisherAgent.ts — agent definition"]
                AG2["capabilities/negotiatePrice.ts"]
                AG3["capabilities/checkReputation.ts"]
                AG4["capabilities/evaluateContent.ts"]
                AG5["capabilities/updateReputation.ts"]
                AG6["index.ts — agent server entry"]
            end

            subgraph Scripts["scripts/"]
                SC1["demoConsumer.ts — full e2e demo\nviem wallet + negotiate + x402"]
                SC2["deployContract.ts — CDP-based deploy"]
            end

            subgraph DB["prisma/"]
                DB1["schema.prisma — MongoDB models"]
                DB2["seed.ts — demo publisher via CDP"]
            end
        end
    end
```

---

## 8. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `CDP_API_KEY_NAME` | `lib/cdp/config.ts` | Coinbase CDP API key ID |
| `CDP_API_KEY_PRIVATE_KEY` | `lib/cdp/config.ts` | CDP API secret (base64 Ed25519) |
| `CDP_WALLET_SECRET` | `@coinbase/cdp-sdk` v1 | Wallet encryption secret (CDP Portal → Settings → Wallet Secrets) |
| `DEMO_PRIVATE_KEY` | `scripts/demoConsumer.ts` | Funded Base Sepolia key for demo consumer wallet |
| `OPENAI_API_KEY` | `agents/capabilities/evaluateContent.ts` | Content quality scoring |
| `OPENSERV_API_KEY` | `agents/publisherAgent.ts` | OpenServ agent platform |
| `AGENT_REGISTRY_CONTRACT` | `lib/erc8004/registry.ts` | Deployed contract address on Base Sepolia |
| `X402_FACILITATOR_URL` | `app/api/content/[id]/route.ts` | Payment verification endpoint |
| `DATABASE_URL` | `lib/prisma.ts` | MongoDB Atlas connection string |
| `NEXT_PUBLIC_BASE_RPC` | `lib/erc8004/registry.ts` | Base Sepolia RPC URL |
| `NEXTAUTH_SECRET` | NextAuth | Session signing secret |
| `NEXTAUTH_URL` | NextAuth | App base URL |

---

## 9. Run Commands

```bash
# ── Contracts ──────────────────────────────────────
cd contracts
PRIVATE_KEY=<funded_key> npm run deploy   # deploy to Base Sepolia

# ── Frontend setup ─────────────────────────────────
cd frontend
npm install
cp .env.local.example .env.local          # fill in credentials
npx prisma generate                        # generate MongoDB client
npx prisma db push                         # create collections + indexes
npm run db:seed                            # seed demo publisher (needs CDP)

# ── Run ────────────────────────────────────────────
npm run dev                                # start dev server → http://localhost:3000
npm run demo                               # run full consumer demo (uses DEMO_PRIVATE_KEY)
npm run agent                              # start OpenServ publisher agent server
npm run build                              # production build

# ── Utilities ──────────────────────────────────────
npx tsc --noEmit                           # type check
npx prisma studio                          # MongoDB GUI browser
```
