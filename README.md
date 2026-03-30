# HatidPay

Cross-border supplier escrow payments for Filipino SMEs, built on Stellar.

---

## Problem

A sari-sari store owner in Quezon City buying inventory from a Chinese supplier on Alibaba waits 3-5 business days for a wire transfer to clear and pays PHP 800-1,500 in bank fees per transaction. GCash and Maya cap out at PHP 100,000, making them unusable for bulk orders. The buyer either absorbs the fees or delays restocking and loses sales.

## Solution

HatidPay lets the buyer pay her supplier in USDC on Stellar. Funds are locked in a Soroban smart contract escrow and released only when the buyer confirms delivery. If no confirmation happens within 72 hours, either party can trigger an auto-release. Settlement happens in under 5 seconds with fees under $0.01.

---

## Demo Flow (2 minutes)

1. Connect Freighter wallet (testnet)
2. Enter supplier Stellar address and invoice amount
3. Submit — contract locks USDC on-chain
4. Supplier sees escrow is funded
5. Buyer confirms delivery — USDC releases to supplier instantly

---

## Architecture

```
Browser (React + Vite)
  |-- Freighter Wallet API      (signing)
  |-- @stellar/stellar-sdk      (transaction building, RPC)
  |-- Convex                    (real-time off-chain state sync)
  |-- Soroban RPC               (on-chain reads and writes)

Stellar Testnet
  |-- HatidPay Soroban Contract (escrow logic)
  |-- USDC Token Contract       (SEP-41 token)
```

No backend server. All escrow state lives on-chain. Convex mirrors it for real-time UI updates and activity logs.

---

## Project Structure

```
stellar-proj/
├── contracts/
│   ├── src/
│   │   ├── lib.rs              # Soroban escrow contract
│   │   └── test.rs             # 5 contract tests
│   └── Cargo.toml
├── frontend/
│   ├── convex/                 # Convex schema, queries, mutations
│   │   ├── schema.ts
│   │   ├── escrows.ts
│   │   └── users.ts
│   ├── src/
│   │   ├── lib/
│   │   │   ├── stellar.ts      # Contract invocations, balance reads
│   │   │   ├── freighter.ts    # Wallet connect and signing
│   │   │   ├── sep24.ts        # SEP-10 auth + SEP-24 deposit flow
│   │   │   └── config.ts       # Environment constants
│   │   ├── views/              # Page-level components
│   │   ├── components/         # Shared UI components
│   │   ├── types/              # TypeScript interfaces
│   │   └── styles/             # Global CSS design system
│   └── .env                    # Environment variables
├── docs/
│   ├── requirements.md
│   ├── design.md
│   └── architecture.md
└── README.md
```

---

## Stellar Features Used

| Feature | Usage |
|---|---|
| Soroban smart contracts | Escrow logic — lock, release, dispute, expiry |
| USDC on Stellar | Stablecoin settlement, no XLM volatility |
| Trustlines | Supplier must trust USDC before receiving funds (KYC gating) |
| Clawback | Anchor can reverse funds during a dispute grace period |
| SEP-24 | Interactive PHP-to-USDC on-ramp via local anchor |
| SEP-10 | Wallet-based authentication with Stellar anchors |

---

## Smart Contract

Deployed on Stellar testnet:
```
CCCNLLVKINNZLO6LLXVG23GHN6ZHVBUEEDPDMO3WATQUTIFA7HTSK2ER
```

Explorer: https://stellar.expert/explorer/testnet/contract/CCCNLLVKINNZLO6LLXVG23GHN6ZHVBUEEDPDMO3WATQUTIFA7HTSK2ER?filter=interface

### Contract Functions

| Function | Caller | Description |
|---|---|---|
| `create_escrow(buyer, supplier, token, amount, deadline)` | Buyer | Locks USDC, returns escrow ID |
| `confirm_delivery(escrow_id)` | Buyer | Releases USDC to supplier |
| `claim_expired(escrow_id)` | Supplier | Claims funds after deadline |
| `raise_dispute(escrow_id)` | Buyer or Supplier | Freezes escrow for arbitration |
| `get_escrow(escrow_id)` | Anyone | Read-only escrow state |

### Escrow Status Lifecycle

```
Created --> Confirmed (buyer calls confirm_delivery)
        --> Expired   (supplier calls claim_expired after deadline)
        --> Disputed  (either party calls raise_dispute)
```

![alt text](images\home-page.png)
![alt text](images\escrow-page.png)
---

## Prerequisites

**For the smart contract:**
- Rust (latest stable)
- Soroban CLI v25+
- Stellar testnet account funded via Friendbot

**For the frontend:**
- Node.js 18+
- Freighter browser extension set to Testnet
- Testnet XLM (for gas) and testnet USDC

---

## Setup

### Smart Contract

```bash
# Build
soroban contract build

# Test
cargo test

# Deploy to testnet
soroban keys generate --global deployer --network testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hatid_pay.wasm \
  --source deployer \
  --network testnet
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

**Environment variables** (`.env`):

```env
VITE_CONTRACT_ID=<deployed contract ID>
VITE_USDC_CONTRACT_ID=<testnet USDC contract ID>
VITE_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
CONVEX_DEPLOYMENT=dev:<your-convex-deployment>
VITE_CONVEX_URL=https://<your-convex-deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<your-convex-deployment>.convex.site
```

### Convex (real-time backend)

```bash
cd frontend
npx convex dev
```

---

## Sample CLI Invocations

```bash
# Create escrow: buyer locks 50 USDC for supplier, 72-hour window
soroban contract invoke \
  --id CCCNLLVKINNZLO6LLXVG23GHN6ZHVBUEEDPDMO3WATQUTIFA7HTSK2ER \
  --source buyer \
  --network testnet \
  -- create_escrow \
  --buyer <BUYER_ADDRESS> \
  --supplier <SUPPLIER_ADDRESS> \
  --token <USDC_CONTRACT_ADDRESS> \
  --amount 500000000 \
  --deadline 1717200000

# Confirm delivery
soroban contract invoke \
  --id CCCNLLVKINNZLO6LLXVG23GHN6ZHVBUEEDPDMO3WATQUTIFA7HTSK2ER \
  --source buyer \
  --network testnet \
  -- confirm_delivery \
  --escrow_id 1

# Check escrow state
soroban contract invoke \
  --id CCCNLLVKINNZLO6LLXVG23GHN6ZHVBUEEDPDMO3WATQUTIFA7HTSK2ER \
  --network testnet \
  -- get_escrow \
  --escrow_id 1
```

---

## Target Users

Filipino small retail business owners (sari-sari stores, online resellers, market vendors) earning PHP 30,000-150,000/month who regularly import goods from overseas suppliers. They are bleeding money on remittance fees and losing days waiting for bank transfers to clear. Every PHP 1,000 saved on fees is inventory they can restock.

---

## Why Stellar

No other chain gives sub-cent fees with native USDC support and built-in compliance controls that anchors and regulators care about. Stellar's speed (3-5 second finality) and cost (<$0.01 per transaction) makes this directly competitive against the bank wire alternative. The escrow contract is composable — it can be reused for any B2B trade, not just PH-CN.
