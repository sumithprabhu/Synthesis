# Parley Protocol — Demo Video Script
**Target length: 4–5 minutes**

---

## [0:00–0:30] Hook

*(open the live site — parley-protocol.vercel.app)*

Hey everyone, I’m Sumith, and today I’m demoing Parley Protocol, my submission for the Synthesis Hackathon.

So here's the problem. AI agents are starting to browse the web, read content, do research — but there's no real way for publishers to charge them. You can't put a credit card form in front of a bot. And publishers shouldn't have to give their stuff away for free just because the reader is an AI.

Parley Protocol fixes that. It's an open negotiation layer — AI agents can discover articles, negotiate a price, and pay in real USDC on Base, fully autonomously. No human in the loop. Publishers get paid automatically.

Let me show you how it works.

---

## [0:30–1:30] Architecture — How It's Built

*(open /docs/architecture on the site)*

Quick look at the architecture before we get into the demo.

There are three layers.

At the bottom you've got **Base Sepolia** — the on-chain layer. Two key contracts here. First is USDC — all payments are real USDC transfers on Base. Second is the **ERC-8004 AgentRegistry** — this is a standard for agent identity and reputation on-chain. Every agent has a score, and that score actually affects what price they negotiate.

In the middle is the **Parley Protocol platform** — this is the Next.js app you're looking at right now. It has a few key APIs: the content endpoint which gates articles behind x402 payment, the negotiation engine which runs on Claude AI, and the dashboard for publishers to track earnings.

And at the top you've got the agents. A **publisher agent** built on the OpenServ SDK that handles negotiation on the publisher's side, and a **consumer agent** that browses articles, negotiates, and pays — all on its own.

The payment protocol is **x402** — an open standard where the server returns an HTTP 402 with payment requirements, the agent signs an EIP-3009 authorization, and USDC moves on-chain without anyone clicking anything.

Publisher wallets are managed by **Coinbase Developer Platform** — so when a publisher signs up, a CDP wallet is created for them automatically. They don't have to set anything up. Payments just land in their wallet.

Alright, let's actually use it.

---

## [1:30–2:30] Publisher Side

*(go to /login)*

I'll log in as a publisher. Just email and password — or you can connect a wallet directly.

*(log in, land on /dashboard)*

This is the publisher dashboard. You can see earnings here, recent access logs — which articles were bought, by which agent, what they paid — and the negotiation history showing every round of back and forth.

The interesting part is the negotiation personality settings. A publisher can set their minimum price, how generous they want to be with discounts, and a reputation threshold — agents with a high on-chain reputation score get better deals automatically.

*(go to /publish)*

Publishing is straightforward. Write the article, set a price, and it's live. That's it. From this point on, any AI consumer agent that hits the content API will go through the full negotiation and payment flow automatically. The publisher doesn't have to do anything else.

---

## [2:30–3:45] The Agent Negotiation — Live Demo

*(switch to the site, open /demo)*

Now the good part. This is the live demo playground — it runs a real consumer agent flow against actual published content on Base Sepolia.

*(click Try Demo)*

Watch what happens step by step.

First the agent calls the content API — and it gets back a **402 Payment Required**. That's the x402 protocol in action. The server is saying "you want this article, here are the payment requirements." USDC on Base Sepolia, pay to this address, here's the max amount.

Now instead of just paying full price, the agent goes to negotiate. It sends an offer to the negotiation engine — something like 0.0003 USDC. Before deciding, the engine does something important — it reads the **ERC-8004 registry on-chain** to check the consumer agent's reputation score. New agent, score of 50, no prior deals.

Then the **agent negotiation engine** runs. It looks at the publisher's settings, the agent's reputation, the offer on the table, and comes back with a decision — either accept, counter, or in some cases free access if the use case matches.

If it's a counter, the agent bumps its offer and tries again. This back and forth can go a few rounds. When they land on a price, the agent signs an **EIP-3009 TransferWithAuthorization** — that's the actual USDC transfer, signed off-chain but settled on Base Sepolia by the x402 facilitator.

And there it is — the content unlocks. Full article delivered. Real USDC moved on-chain.

---

## [3:45–4:30] On-Chain Proof

*(open sepolia.basescan.org)*

Let me show you the actual transaction. Here's a USDC transfer on Base Sepolia from a recent demo run — you can see the from address, the to address which is the publisher wallet, and the amount. This is a real on-chain settlement, not a mock.

*(open the ERC-8004 contract)*

And here's the **ERC-8004 AgentRegistry contract** on Base Sepolia. This is where agent identities and reputation scores live. After a deal completes, the publisher agent can update the consumer's reputation — so the next time that agent negotiates anywhere on the protocol, its history follows it on-chain.

---

## [4:30–5:00] Close

*(back to parley-protocol.vercel.app)*

So that's Parley Protocol. Publishers set a price, agents negotiate, USDC moves on-chain. No human involvement, no credit cards, no API keys being handed out manually.

It's built on x402 for payments, ERC-8004 for agent reputation, OpenServ SDK for the agent layer, Claude for negotiation intelligence, and CDP for publisher wallet management — all on Base.

The repo is open — github.com/sumithprabhu/Parley-Protocol — and the live site is at parley-protocol.vercel.app.

Publishers get paid. Agents get content. That's Parley Protocol.

---

## Notes for Recording

- Keep terminal or demo font size large — viewers need to read the logs
- The **counter → accept moment** in the demo is the key visual — slow down there, let it land
- Say "real USDC on Base Sepolia" and "on-chain settlement" at least twice — judges look for this
- Don't rush the architecture section — 45–60 seconds there is fine, it sets up why the demo matters
- If the demo takes a few seconds to load, just narrate what's happening — "it's checking reputation on-chain right now"
