# Requirements Document

## Introduction

HatidPay is a cross-border supplier payment platform built for Filipino SMEs (sari-sari stores, online resellers, market vendors). It enables buyers in the Philippines to pay overseas suppliers (e.g. Chinese suppliers on Alibaba) using USDC on the Stellar network — bypassing slow bank wires and high remittance fees. The core mechanism is a Soroban smart contract escrow that locks USDC until the buyer confirms delivery, with a 72-hour auto-release window and anchor-backed compliance controls (trustlines + clawback).

The MVP must be demo-able in under 2 minutes: create escrow → fund it → confirm delivery → funds release.

---

## Requirements

### Requirement 1: Escrow Creation

**User Story:** As a buyer (Filipino SME owner), I want to create an escrow payment for my supplier, so that funds are locked on-chain and only released when I confirm delivery.

#### Acceptance Criteria

1. WHEN the buyer submits a supplier Stellar address, invoice amount in USD, and a deadline THEN the system SHALL invoke the `create_escrow` function on the Soroban contract and lock the specified USDC amount.
2. WHEN an escrow is created THEN the system SHALL assign a unique escrow ID and store the buyer address, supplier address, token address, amount, and deadline on-chain.
3. WHEN the escrow is created successfully THEN the system SHALL display the escrow ID and current status to the buyer.
4. IF the supplier does not have a USDC trustline THEN the system SHALL prevent escrow creation and notify the buyer that the supplier must establish a trustline first.
5. IF the buyer has insufficient USDC balance THEN the system SHALL reject the transaction and display an appropriate error message.

---

### Requirement 2: PHP-to-USDC On-Ramp via Local Anchor

**User Story:** As a buyer, I want to deposit PHP through a local anchor and receive USDC in my Stellar wallet, so that I can fund escrow payments without needing a crypto exchange account.

#### Acceptance Criteria

1. WHEN the buyer initiates a PHP deposit THEN the system SHALL guide them through the anchor's SEP-24 or OTC deposit flow.
2. WHEN the anchor confirms the PHP deposit THEN the system SHALL reflect the minted USDC balance in the buyer's Stellar wallet within the app.
3. WHEN the buyer's USDC balance is updated THEN the system SHALL allow them to proceed to escrow creation.
4. IF the anchor deposit fails or times out THEN the system SHALL notify the buyer and provide retry instructions.

---

### Requirement 3: Escrow Funding and Status Visibility

**User Story:** As a supplier, I want to see that the escrow has been funded before I ship goods, so that I have confidence the payment is secured.

#### Acceptance Criteria

1. WHEN an escrow is funded THEN the system SHALL display the escrow status as "Funded" to both buyer and supplier.
2. WHEN the supplier queries an escrow by ID THEN the system SHALL return the escrow details including amount, deadline, and current status.
3. WHEN the escrow status changes (funded, confirmed, released, disputed) THEN the system SHALL reflect the updated status in the UI in near real-time.

---

### Requirement 4: Delivery Confirmation and Fund Release

**User Story:** As a buyer, I want to confirm delivery of goods so that the USDC is released to my supplier automatically.

#### Acceptance Criteria

1. WHEN the buyer calls `confirm_delivery` on a funded escrow THEN the system SHALL release the locked USDC to the supplier's Stellar address.
2. WHEN delivery is confirmed THEN the system SHALL update the escrow status to "Released" and display a success message to both parties.
3. IF the buyer attempts to confirm delivery on an escrow they did not create THEN the system SHALL reject the call with an unauthorized error.
4. IF the buyer attempts to confirm delivery on an already-confirmed or released escrow THEN the system SHALL reject the call and prevent double-confirmation.

---

### Requirement 5: Auto-Release on Deadline Expiry

**User Story:** As a supplier, I want funds to auto-release if the buyer doesn't confirm delivery within 72 hours, so that I'm not left waiting indefinitely.

#### Acceptance Criteria

1. WHEN the escrow deadline passes and the buyer has not confirmed delivery THEN the system SHALL allow either party to trigger an expiry release.
2. WHEN the expiry release is triggered THEN the system SHALL transfer the USDC to the supplier and update the escrow status to "Expired/Released".
3. IF the deadline has not yet passed THEN the system SHALL reject any expiry release attempt.

---

### Requirement 6: Dispute and Clawback

**User Story:** As an anchor or compliance officer, I want to be able to freeze or claw back funds during a dispute window, so that fraudulent or erroneous transactions can be reversed.

#### Acceptance Criteria

1. WHEN a dispute is raised within the grace period THEN the system SHALL allow the anchor to freeze the escrow funds.
2. WHEN the anchor initiates a clawback THEN the system SHALL return the USDC to the buyer's wallet and update the escrow status to "Disputed/Clawed Back".
3. IF the grace period has expired THEN the system SHALL reject any clawback attempt.
4. WHEN an escrow is frozen THEN the system SHALL prevent any further state changes (confirm, release, expiry) until the dispute is resolved.

---

### Requirement 7: Trustline Verification

**User Story:** As a buyer, I want the system to verify that my supplier has a USDC trustline before I create an escrow, so that the payment won't fail at the point of release.

#### Acceptance Criteria

1. WHEN the buyer enters a supplier Stellar address THEN the system SHALL check whether the supplier has an active USDC trustline on Stellar.
2. IF the supplier does not have a USDC trustline THEN the system SHALL display a clear warning and block escrow creation.
3. WHEN the supplier establishes a trustline THEN the system SHALL allow the buyer to proceed with escrow creation.

---

### Requirement 8: Mobile-First Web Application

**User Story:** As a Filipino SME owner using a smartphone, I want a mobile-friendly web interface, so that I can manage payments on the go without needing a desktop.

#### Acceptance Criteria

1. WHEN the app is accessed on a mobile browser THEN the system SHALL render a responsive, touch-friendly UI optimized for screens 375px and above.
2. WHEN the buyer connects their Stellar wallet (e.g. Freighter) THEN the system SHALL support wallet connection via browser extension or WalletConnect-compatible flow.
3. WHEN the buyer performs any transaction THEN the system SHALL provide clear loading states, success confirmations, and error messages in plain language (Filipino/English).

---

### Requirement 9: Invoice OCR Auto-Population (Optional / Bonus)

**User Story:** As a buyer, I want to upload an Alibaba invoice image or PDF and have the payment details auto-filled, so that I can reduce manual entry errors and save time.

#### Acceptance Criteria

1. WHEN the buyer uploads an invoice image or PDF THEN the system SHALL run OCR and LLM extraction to parse the supplier info, amount, and item descriptions.
2. WHEN extraction is successful THEN the system SHALL auto-populate the escrow creation form with the parsed values.
3. IF extraction fails or confidence is low THEN the system SHALL display the raw extracted text and allow the buyer to manually correct the fields.
4. WHEN auto-populated fields are shown THEN the system SHALL allow the buyer to review and edit all values before submitting.

---

### Requirement 10: Testnet Deployment and Demo Flow

**User Story:** As a developer or demo presenter, I want the full escrow flow to be executable on Stellar testnet, so that the product can be demonstrated end-to-end in under 2 minutes.

#### Acceptance Criteria

1. WHEN the Soroban contract is built THEN the system SHALL compile to a `.wasm` file deployable via Soroban CLI to Stellar testnet.
2. WHEN deployed to testnet THEN the system SHALL support the full flow: create escrow → fund → confirm delivery → release, using testnet USDC and Friendbot-funded accounts.
3. WHEN running `cargo test` THEN the system SHALL pass all 5 tests: happy path, unauthorized caller, state verification, double-confirm prevention, and expiry release.
