# Requirements Document — HatidPay

## Introduction

HatidPay is a cross-border supplier payment platform built for Filipino SMEs (sari-sari stores, online resellers, market vendors). It enables buyers in the Philippines to pay overseas suppliers using USDC on the Stellar network, bypassing slow bank wires and high remittance fees.

The core mechanism is a Soroban smart contract escrow that locks USDC until the buyer confirms delivery. A 72-hour auto-release window protects the supplier if the buyer is unresponsive. Anchor-backed compliance controls (trustlines and clawback) satisfy regulatory requirements.

**The MVP must be demo-able in under 2 minutes: create escrow → fund it → confirm delivery → funds release.**

---

## Requirements

### Requirement 1: Escrow Creation

**User Story:** As a buyer (Filipino SME owner), I want to create an escrow payment for my supplier so that funds are locked on-chain and only released when I confirm delivery.

#### Acceptance Criteria

1. WHEN the buyer submits a supplier Stellar address, invoice amount in USD, and a deadline THEN the system SHALL invoke `create_escrow` on the Soroban contract and lock the specified USDC amount.
2. WHEN an escrow is created THEN the system SHALL assign a unique escrow ID and store the buyer address, supplier address, token address, amount, and deadline on-chain.
3. WHEN the escrow is created successfully THEN the system SHALL display the escrow ID and current status to the buyer.
4. IF the supplier does not have a USDC trustline THEN the system SHALL prevent escrow creation and notify the buyer that the supplier must establish a trustline first.
5. IF the buyer has insufficient USDC balance THEN the system SHALL reject the transaction and display an appropriate error message.

---

### Requirement 2: PHP-to-USDC On-Ramp via Local Anchor

**User Story:** As a buyer, I want to deposit PHP through a local anchor and receive USDC in my Stellar wallet so that I can fund escrow payments without needing a crypto exchange account.

#### Acceptance Criteria

1. WHEN the buyer initiates a PHP deposit THEN the system SHALL guide them through the anchor's SEP-24 interactive deposit flow.
2. WHEN the anchor confirms the PHP deposit THEN the system SHALL reflect the updated USDC balance in the buyer's Stellar wallet within the app.
3. WHEN the buyer's USDC balance is updated THEN the system SHALL allow them to proceed to escrow creation.
4. IF the anchor deposit fails or times out THEN the system SHALL notify the buyer and provide retry instructions.

**Current Implementation Note:** The on-ramp view uses `testanchor.stellar.org` with SEP-10 authentication and SEP-24 interactive deposit. Real Philippine peso anchors (GCash, Maya, Cebuana) are placeholders pending production anchor partnerships.

---

### Requirement 3: Escrow Funding and Status Visibility

**User Story:** As a supplier, I want to see that the escrow has been funded before I ship goods so that I have confidence the payment is secured.

#### Acceptance Criteria

1. WHEN an escrow is funded THEN the system SHALL display the escrow status as "Created" to both buyer and supplier.
2. WHEN the supplier queries an escrow by ID THEN the system SHALL return the escrow details including amount, deadline, and current status.
3. WHEN the escrow status changes (created, confirmed, expired, disputed) THEN the system SHALL reflect the updated status in the UI in real time via Convex subscriptions.

---

### Requirement 4: Delivery Confirmation and Fund Release

**User Story:** As a buyer, I want to confirm delivery of goods so that the USDC is released to my supplier.

#### Acceptance Criteria

1. WHEN the buyer calls `confirm_delivery` on a funded escrow THEN the system SHALL release the locked USDC to the supplier's Stellar address.
2. WHEN delivery is confirmed THEN the system SHALL update the escrow status to "Confirmed" and display a success message to both parties.
3. IF the buyer attempts to confirm delivery on an escrow they did not create THEN the system SHALL reject the call with an unauthorized error.
4. IF the buyer attempts to confirm delivery on an already-confirmed or settled escrow THEN the system SHALL reject the call and prevent double-confirmation.

---

### Requirement 5: Auto-Release on Deadline Expiry

**User Story:** As a supplier, I want funds to be claimable if the buyer does not confirm delivery within 72 hours so that I am not left waiting indefinitely.

#### Acceptance Criteria

1. WHEN the escrow deadline passes and the buyer has not confirmed delivery THEN the system SHALL allow either party to trigger an expiry release via `claim_expired`.
2. WHEN the expiry release is triggered THEN the system SHALL transfer the USDC to the supplier and update the escrow status to "Expired".
3. IF the deadline has not yet passed THEN the system SHALL reject any expiry release attempt with a `NotExpired` error.

---

### Requirement 6: Dispute and Clawback

**User Story:** As an anchor or compliance officer, I want to be able to freeze or claw back funds during a dispute window so that fraudulent or erroneous transactions can be reversed.

#### Acceptance Criteria

1. WHEN a dispute is raised within the grace period THEN the system SHALL allow either party to freeze the escrow funds via `raise_dispute`.
2. WHEN the anchor initiates a clawback THEN the system SHALL return the USDC to the buyer's wallet and update the escrow status to "Disputed".
3. IF the grace period has expired THEN the system SHALL reject any clawback attempt.
4. WHEN an escrow is frozen THEN the system SHALL prevent any further state changes (confirm, release, expiry) until the dispute is resolved.

---

### Requirement 7: Trustline Verification

**User Story:** As a buyer, I want the system to verify that my supplier has a USDC trustline before I create an escrow so that the payment does not fail at the point of release.

#### Acceptance Criteria

1. WHEN the buyer enters a supplier Stellar address THEN the system SHALL check whether the supplier has an active USDC trustline on Stellar.
2. IF the supplier does not have a USDC trustline THEN the system SHALL display a clear warning and block escrow creation.
3. WHEN the supplier establishes a trustline THEN the system SHALL allow the buyer to proceed with escrow creation.

---

### Requirement 8: Mobile-First Web Application

**User Story:** As a Filipino SME owner using a smartphone, I want a mobile-friendly web interface so that I can manage payments on the go without needing a desktop.

#### Acceptance Criteria

1. WHEN the app is accessed on a mobile browser THEN the system SHALL render a responsive, touch-friendly UI optimized for screens 375px and above.
2. WHEN the buyer connects their Stellar wallet via Freighter THEN the system SHALL support wallet connection via browser extension.
3. WHEN the buyer performs any transaction THEN the system SHALL provide clear loading states, success confirmations, and error messages.
4. WHEN data is loading THEN the system SHALL show skeleton placeholder cards rather than empty states or spinners.

---

### Requirement 9: Invoice OCR Auto-Population (Optional)

**User Story:** As a buyer, I want to upload an Alibaba invoice image or PDF and have the payment details auto-filled so that I reduce manual entry errors and save time.

#### Acceptance Criteria

1. WHEN the buyer uploads an invoice image or PDF THEN the system SHALL run OCR and LLM extraction to parse the supplier info, amount, and item descriptions.
2. WHEN extraction is successful THEN the system SHALL auto-populate the escrow creation form with the parsed values.
3. IF extraction fails or confidence is low THEN the system SHALL display the raw extracted text and allow the buyer to manually correct the fields.
4. WHEN auto-populated fields are shown THEN the system SHALL allow the buyer to review and edit all values before submitting.

**Status:** Not yet implemented. Planned as a post-MVP feature.

---

### Requirement 10: Testnet Deployment and Demo Flow

**User Story:** As a developer or demo presenter, I want the full escrow flow to be executable on Stellar testnet so that the product can be demonstrated end-to-end in under 2 minutes.

#### Acceptance Criteria

1. WHEN the Soroban contract is built THEN the system SHALL compile to a `.wasm` file deployable via Soroban CLI to Stellar testnet.
2. WHEN deployed to testnet THEN the system SHALL support the full flow: create escrow → confirm delivery → release, using testnet USDC and Friendbot-funded accounts.
3. WHEN running `cargo test` THEN the system SHALL pass all 5 tests: happy path, unauthorized caller, state verification, double-confirm prevention, and expiry release.

---

## Out of Scope (MVP)

The following are explicitly deferred and not required for the MVP demo:

- Real Philippine peso anchor integration (GCash, Maya, Cebuana)
- Multi-escrow batch operations
- Supplier-side account creation flow
- Push notifications for escrow state changes
- Invoice OCR parsing
- CSV export of transaction history
- Dark mode
- Multi-language support (English only for MVP)
- Admin or anchor dashboard for dispute management

---

## Constraints

| Category | Decision |
|---|---|
| Region | Philippines (SEA) |
| User type | SME buyers and overseas suppliers |
| Network | Stellar testnet (demo), Stellar mainnet (post-MVP) |
| Wallet | Freighter browser extension only |
| Stablecoin | USDC (SEP-41 token contract) |
| Frontend | React + Vite, no backend server |
| Real-time state | Convex (off-chain mirror) |
| Contract language | Rust (Soroban) |
| Demo time limit | 2 minutes end-to-end |
