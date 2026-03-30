# HatidPay

**Instant cross-border supplier payments for Filipino SMEs — no bank delays, no GCash limits, no middlemen.**

---

## The Idea

### PROJECT NAME
**HatidPay**

### PROBLEM
A sari-sari store owner in Quezon City who buys inventory from a Chinese supplier on Alibaba waits 3–5 business days for a wire transfer to clear, pays ₱800–₱1,500 in bank fees per transaction, and can't use GCash or Maya because they cap out at ₱100K — meaning she either eats the fees or delays restocking and loses sales.

### SOLUTION
HatidPay lets the store owner pay her supplier in USDC on Stellar by converting her PHP deposit through a local anchor, executing an on-chain escrow that releases payment when both parties confirm delivery — all settled in under 5 seconds with fees under $0.01. Stellar is essential here because no other chain gives you sub-cent fees with native USDC support and built-in compliance controls (trustlines + clawback) that anchors and regulators actually care about.

### STELLAR FEATURES USED
- **USDC transfers** — stablecoin settlement so neither party takes on XLM volatility
- **Soroban smart contracts** — escrow logic that locks funds until delivery confirmation
- **Trustlines** — the supplier must trust USDC before receiving payment (built-in KYC gating)
- **Clawback / Compliance** — anchor can freeze or claw back funds if a dispute is filed within the grace period

### TARGET USERS
- **Who:** Small retail business owners (sari-sari, online resellers, market vendors) earning ₱30K–₱150K/month who regularly import goods or buy from cross-border suppliers
- **Where:** Metro Manila and Luzon urban centers (Quezon City, Manila, Cebu, Davao)
- **Why they care:** They're bleeding money on remittance fees and losing days waiting for bank transfers. Their margins are thin — every ₱1,000 saved on fees is inventory they can stock

### CORE FEATURE (MVP)
**The transaction flow that proves this works:**

1. **Buyer opens HatidPay** → enters supplier's Stellar address + invoice amount in USD
2. **Buyer deposits PHP** via local anchor (e.g. bank transfer or OTC) → anchor mints USDC to buyer's Stellar wallet
3. **Buyer hits "Pay & Escrow"** → Soroban contract locks the USDC amount, sets a 72-hour delivery window
4. **Supplier sees escrow funded** → ships the goods
5. **Buyer confirms delivery** → contract releases USDC to supplier
6. **If no confirmation in 72 hours** → either party can raise a dispute, or funds auto-release to supplier (configurable)

Demo-able in under 2 minutes: Create escrow → Fund it → Confirm delivery → Funds release. Done.

### WHY THIS WINS
This fits Stellar's bread and butter — cross-border payments with real compliance hooks. Judges love it because it's not a hypothetical; Filipino SMEs already do this workflow manually through banks and remittance centers every single day. The escrow layer adds trust between strangers (buyer in PH, supplier in CN), and Stellar's speed + cost makes it actually competitive against the bank wire alternative. It's also composable — the escrow contract can be reused for any B2B trade, not just PH-CN.

### OPTIONAL EDGE (FOR BONUS POINTS)
**AI-powered invoice parsing:** Buyer uploads a screenshot or PDF of the Alibaba invoice, an OCR + LLM pipeline extracts the amount, supplier info, and item descriptions — auto-populating the escrow parameters. This cuts the manual entry step and reduces errors. (JP, this plays directly into your OCR platform work at FTAP.)

---

## Constraints

| Category | Selection |
|----------|-----------|
| Region | SEA (Philippines) |
| User Type | SMEs |
| Complexity | Soroban required, Mobile-first, Web app |
| Themes | Micropayments, Remittance, Cross-border B2B payments, Escrow for contracts |

---

## Project Structure

```text
stellar-proj/
├── contracts/
│   ├── src/
│   │   ├── lib.rs          # Soroban smart contract
│   │   └── test.rs         # Contract tests
│   └── Cargo.toml          # Rust/Soroban project config
└── README.md               # This file
```

---

## Stellar Features Used

- Soroban smart contracts (escrow logic)
- USDC on Stellar (stablecoin settlement)
- Trustlines (compliance gating)
- Clawback-enabled assets (dispute resolution)

## Smart Contract Implementation (`contracts/src/lib.rs`)

The core logic is implemented as a Soroban smart contract. It maps directly to the MVP flow, handling secure locking and release of payments via the following operations:

- **`create_escrow`**: Called by the **buyer** to initiate the transaction. It locks the designated tokens (e.g., USDC) directly from the buyer and registers the transaction with a `Created` status.
- **`confirm_delivery`**: Called by the **buyer** upon successful receipt of goods. This releases the locked tokens to the **supplier** and updates the escrow to a `Confirmed` status.
- **`claim_expired`**: If the agreed delivery timeline passes without confirmation, the **supplier** can call this function to claim the locked funds, preventing unresponsiveness from blocking payout (status becomes `Expired`).
- **`raise_dispute`**: Can be invoked by **either party** while the escrow is active. It immediately changes the state to `Disputed`, freezing all withdrawals and funds pending offline arbitration.
- **`get_escrow`**: A read-only helper to inspect the state or details of any given escrow transaction.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Soroban CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) v25+
- A Stellar testnet account with test XLM (use Friendbot)

## Build

```bash
soroban contract build
```

This compiles the contract to a `.wasm` file in `target/wasm32-unknown-unknown/release/`.

## Test

```bash
cargo test
```

Runs all 5 tests: happy path, unauthorized caller, state verification, double-confirm prevention, and expiry release.

## Deploy to Testnet

```bash
# Generate a testnet identity (if you haven't already)
soroban keys generate --global deployer --network testnet

# Fund it via Friendbot
soroban keys address deployer
# Visit https://friendbot.stellar.org?addr=<YOUR_ADDRESS>

# Deploy the contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hatid_pay.wasm \
  --source deployer \
  --network testnet
```

This returns the contract ID — save it.

## Sample CLI Invocation

```bash
# Create an escrow: buyer locks 50 USDC for supplier, 72-hour window
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source buyer \
  --network testnet \
  -- \
  create_escrow \
  --buyer <BUYER_ADDRESS> \
  --supplier <SUPPLIER_ADDRESS> \
  --token <USDC_CONTRACT_ADDRESS> \
  --amount 50000000 \
  --deadline 1717200000

# Confirm delivery (buyer calls this)
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source buyer \
  --network testnet \
  -- \
  confirm_delivery \
  --escrow_id 1

# Check escrow status
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- \
  get_escrow \
  --escrow_id 1
```

## Timeline

| Phase | Duration | What Gets Done |
|-------|----------|----------------|
| Day 1 | 8 hours | Contract design, lib.rs + tests, deploy to testnet |
| Day 2 | 8 hours | React frontend (mobile-first), wallet connection, escrow creation UI |
| Day 3 | 4 hours | Invoice OCR integration (optional), polish, demo prep |

## License

MIT