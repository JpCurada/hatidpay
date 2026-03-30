# Design Document — HatidPay

## Overview

HatidPay is a mobile-first web application enabling Filipino SME buyers to pay overseas suppliers using USDC on Stellar via a Soroban smart contract escrow. The system has three layers:

1. **Soroban Smart Contract** — on-chain escrow logic deployed to Stellar testnet
2. **React Frontend** — mobile-first UI for wallet connection, escrow creation, and status tracking
3. **Convex** — real-time off-chain state mirror for instant UI updates and activity logs

The MVP demo flow: connect wallet → create escrow → supplier views it → buyer confirms delivery → USDC releases. Completable in under 2 minutes on testnet.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Browser (React + Vite)          │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Views    │  │  lib/    │  │  Convex   │  │
│  │Dashboard │  │stellar.ts│  │  Queries  │  │
│  │Create    │  │freighter │  │  Mutations│  │
│  │Detail    │  │sep24.ts  │  │           │  │
│  │History   │  │config.ts │  └─────┬─────┘  │
│  │Dispute   │  └────┬─────┘        │        │
│  └──────────┘       │              │        │
└─────────────────────┼──────────────┼────────┘
                      │              │
          ┌───────────▼──┐   ┌───────▼────────┐
          │ Stellar RPC  │   │ Convex Cloud   │
          │ (Testnet)    │   │ (Real-time DB) │
          └───────┬──────┘   └────────────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
┌────▼──────────┐  ┌───────────▼──────────┐
│ HatidPay      │  │ USDC Token Contract  │
│ Soroban       │  │ (SEP-41, Testnet)    │
│ Contract      │  └──────────────────────┘
└───────────────┘
```

**Key design decisions:**

- No backend server. All escrow state lives on-chain. The frontend talks directly to Stellar RPC via `@stellar/stellar-sdk`.
- Freighter handles all key management and transaction signing. No seed phrases ever touch the app.
- Convex mirrors on-chain state after each mutation for real-time dashboard updates and activity logs without polling the blockchain.
- The escrow contract holds USDC directly. The buyer approves the token transfer as part of `create_escrow`.

---

## Frontend Structure

### Views

| View | Route State | Description |
|---|---|---|
| `Landing` | `CONNECT` | Hero, setup instructions, Freighter connect CTA |
| `Dashboard` | `DASHBOARD` | Wallet balance, active escrows, recent activity |
| `CreateEscrow` | `CREATE` | Form to initiate a new escrow on-chain |
| `EscrowDetail` | `DETAIL` | Full escrow view with confirm/dispute actions and countdown |
| `History` | `HISTORY` | All escrows and full activity log |
| `DisputeCenter` | `DISPUTE` | Dispute form with reason selection and evidence upload |

Navigation state is managed in `App.tsx` as a `ViewState` enum. There is no client-side router — the app is a single-page shell with view switching.

### Component Hierarchy

```
App
├── TopAppBar          (brand, desktop nav, wallet address)
├── BottomNavBar       (mobile tab bar: Home, Escrow, History)
└── [active view]
    ├── StatusBadge    (Created / Confirmed / Expired / Disputed)
    └── ...view-specific components
```

### State Management

| Concern | Where |
|---|---|
| Wallet address | `useState` in `App.tsx`, passed as prop |
| Active view | `useState` in `App.tsx` |
| Active escrow ID | `useState` in `App.tsx` |
| Escrow list | Convex `useQuery(api.escrows.listMyEscrows)` |
| Activity log | Convex `useQuery(api.escrows.getMyActivity)` |
| USDC balance | `useState` + `useEffect` in `Dashboard`, fetched via `stellar.ts` |
| User profile | Convex `useQuery(api.users.getUser)` |

---

## Convex Schema

```typescript
// users — one record per connected wallet
users: defineTable({
  stellarAddress: v.string(),
  businessName:   v.optional(v.string()),
  businessType:   v.optional(v.string()),
  avatarUrl:      v.optional(v.string()),
}).index('by_address', ['stellarAddress'])

// escrows — mirrors on-chain state for fast reads
escrows: defineTable({
  escrowId:        v.float64(),
  buyerAddress:    v.string(),
  supplierAddress: v.string(),
  amountUsd:       v.float64(),
  status:          v.string(),
  deadlineAt:      v.float64(),
  invoiceRef:      v.optional(v.string()),
})
.index('by_escrowId',  ['escrowId'])
.index('by_buyer',     ['buyerAddress'])
.index('by_supplier',  ['supplierAddress'])

// activity_logs — append-only event log
activity_logs: defineTable({
  escrowId:    v.optional(v.float64()),
  userAddress: v.string(),
  eventType:   v.string(),
  details:     v.string(),
  createdAt:   v.float64(),
}).index('by_user', ['userAddress'])
```

### Sync Strategy

Every contract mutation (create, confirm, dispute) calls `syncEscrow` on Convex immediately after on-chain confirmation. This upserts the escrow row and appends an activity log entry. Convex pushes the update to all subscribed clients in real time.

---

## Stellar Integration Layer

`frontend/src/lib/stellar.ts` is a thin wrapper over `@stellar/stellar-sdk`. All functions follow the same pattern:

1. Fetch the account from Stellar RPC
2. Build a `TransactionBuilder` with the contract call operation
3. Sign via Freighter (`signWithFreighter`)
4. Submit to Stellar RPC
5. Poll for confirmation (where required)

### Key Functions

```typescript
getUsdcBalance(walletAddress: string): Promise<string>
// Calls balance() on the USDC token contract. Returns formatted string (7 decimal precision).

createEscrow(buyerAddress: string, params: CreateEscrowParams): Promise<string>
// Invokes create_escrow on the HatidPay contract. Returns escrow ID as string.

confirmDelivery(buyerAddress: string, escrowId: number): Promise<void>
// Invokes confirm_delivery. Freighter prompts the buyer to sign.

claimExpired(supplierAddress: string, escrowId: number): Promise<void>
// Invokes claim_expired. Only callable after deadline has passed.

raiseDispute(callerAddress: string, escrowId: number): Promise<void>
// Invokes raise_dispute. Freezes the escrow.

getEscrow(escrowId: number, callerAddress: string): Promise<EscrowData>
// Simulates get_escrow (read-only, no signature required).
```

### Amount Encoding

USDC uses 7 decimal places. All amounts are multiplied by `10_000_000` before being passed to the contract as `i128`. The `amountRaw` field in `EscrowData` stores the raw value; `amount` is the human-readable string.

---

## SEP-24 On-Ramp (Deposit Flow)

`frontend/src/lib/sep24.ts` implements the interactive deposit flow against `testanchor.stellar.org`:

1. `getAnchorConfig()` — fetches `stellar.toml` to discover SEP-10 and SEP-24 endpoints
2. `getSep10Token(walletAddress, webAuthEndpoint)` — challenge-response authentication, returns JWT
3. `initiateDeposit(walletAddress, assetCode, sep24Endpoint, jwt)` — starts interactive deposit, returns popup URL and transaction ID
4. Popup opens at the anchor's URL — the anchor handles PHP payment UI
5. `getTransactionStatus(...)` — polled every 3 seconds until status is `completed` or `error`

In development, all anchor requests are routed through a Vite proxy (`/anchor/*`) to avoid CORS. The popup URL is opened directly (no proxy needed, as it is user-initiated navigation).

---

## Data Types

### On-chain (Soroban)

```rust
pub struct Escrow {
    pub buyer:    Address,
    pub supplier: Address,
    pub token:    Address,
    pub amount:   i128,     // 7 decimal places (e.g. 50 USDC = 500000000)
    pub deadline: u64,      // Unix timestamp (seconds)
    pub status:   EscrowStatus,
}

pub enum EscrowStatus { Created, Confirmed, Expired, Disputed }
```

### Frontend

```typescript
interface EscrowData {
  id:        string;
  buyer:     string;
  supplier:  string;
  token:     string;
  amount:    string;   // human-readable (e.g. "50.00")
  amountRaw: bigint;   // raw i128 value
  deadline:  Date;
  status:    'Created' | 'Confirmed' | 'Expired' | 'Disputed';
}

interface CreateEscrowParams {
  supplierAddress: string;
  amountUSDC:      number;
  deadlineHours:   number;
}
```

---

## Error Handling

### Contract Errors

| Code | Meaning | UI Message |
|---|---|---|
| 1 | `NotFound` | "Escrow not found. Check the ID and try again." |
| 2 | `Unauthorized` | "You are not authorized to perform this action." |
| 3 | `AlreadySettled` | "This escrow has already been settled." |
| 4 | `NotExpired` | "The delivery window has not closed yet." |
| 5 | `InvalidAmount` | "Amount must be greater than zero." |

### Frontend Error States

- Freighter not installed — show install link on Landing
- Wallet connection rejected — show error inline, allow retry
- Insufficient USDC balance — disable submit button, show current balance
- Escrow not found on-chain — show error card with retry button in `EscrowDetail`
- RPC timeout — show error with retry option
- SEP-24 popup blocked — show error with instructions to allow popups

---

## Design System

HatidPay uses a custom neo-brutalist CSS design system defined in `src/styles/global.css`. No Tailwind.

### Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#f5f0e8` | Page background (warm beige) |
| `--bg-white` | `#ffffff` | Card backgrounds |
| `--text-main` | `#1a1a1a` | Primary text, borders |
| `--text-muted` | `#4a4a4a` | Secondary text |
| `--accent-yellow` | `#ffcc00` | Primary actions, highlights |
| `--accent-blue` | `#0055ff` | Links, secondary actions |
| `--accent-red` | `#ef4444` | Danger, disputes |
| `--shadow-neo` | `4px 4px 0px 0px #1a1a1a` | Card shadows |

### Component Classes

| Class | Usage |
|---|---|
| `.card-neo` | Standard white card with offset shadow |
| `.card-neo-flat` | Card with no shadow |
| `.card-neo-accent` | Yellow accent card |
| `.btn-neo` | Base button |
| `.btn-primary` | Yellow CTA button |
| `.btn-secondary` | White secondary button |
| `.btn-danger` | Red destructive button |
| `.btn-dark` | Inverted dark button |
| `.input-neo-box` | Bordered input field |
| `.badge` | Status badge base |
| `.skeleton` | Shimmer loading placeholder |

---

## Testing

### Contract Tests (`contracts/src/test.rs`)

Five tests, run with `cargo test`:

1. Happy path — create, confirm, verify funds released
2. Double-confirm prevention — second confirm returns `AlreadySettled`
3. State verification — read escrow fields after creation
4. Claim before deadline — `claim_expired` returns `NotExpired`
5. Dispute freeze — `raise_dispute` blocks further state changes

### Frontend

- Unit tests with Vitest + React Testing Library
- Mock `stellar-sdk` and `freighter-api`
- Test form validation, status badge rendering, balance display
- E2E with Playwright against Stellar testnet using Friendbot-funded accounts

---

## Deployment

| Layer | Network | URL |
|---|---|---|
| Smart contract | Stellar testnet | See contract ID in `.env` |
| Frontend | Vite dev server | `http://localhost:5173` |
| Convex backend | Convex cloud | `https://<deployment>.convex.cloud` |
| Stellar RPC | Testnet | `https://soroban-testnet.stellar.org` |
