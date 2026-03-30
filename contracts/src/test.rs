#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

/// Helper: sets up the test environment with a deployed contract,
/// a mock USDC token, and funded buyer/supplier accounts.
fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();

    // Allow all contract calls without explicit auth in test setup.
    env.mock_all_auths();

    // IMPORTANT: Set ledger BEFORE registering contracts.
    // The host checks protocol version on registration, so this must come first.
    env.ledger().set(LedgerInfo {
        timestamp: 1_700_000_000,
        protocol_version: 23, // Must match current mainnet protocol for soroban-sdk 23.5.x
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3_110_400,
    });

    // Deploy HatidPay contract.
    let contract_id = env.register(HatidPayContract, ());

    // Create a mock USDC token.
    let admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_admin_client = StellarAssetClient::new(&env, &token_id.address());

    // Create buyer and supplier.
    let buyer = Address::generate(&env);
    let supplier = Address::generate(&env);

    // Mint 1000 USDC to the buyer (7 decimals = 10_000_000_000).
    token_admin_client.mint(&buyer, &10_000_000_000);

    (env, contract_id, token_id.address(), buyer, supplier)
}

/// Test 1 (Happy path): Full escrow lifecycle — create, confirm, funds land with supplier.
///
/// This is the core MVP flow: buyer creates an escrow for 50 USDC,
/// confirms delivery, and the supplier receives the 50 USDC.
#[test]
fn test_happy_path_create_and_confirm() {
    let (env, contract_id, token, buyer, supplier) = setup();
    let client = HatidPayContractClient::new(&env, &contract_id);
    let token_client = TokenClient::new(&env, &token);

    let amount: i128 = 50_000_000; // 50 USDC (7 decimals)
    let deadline: u64 = 1_700_100_000; // ~27 hours from setup timestamp

    // Buyer creates escrow.
    let escrow_id = client.create_escrow(&buyer, &supplier, &token, &amount, &deadline);
    assert_eq!(escrow_id, 1);

    // Buyer's balance should have decreased by 50 USDC.
    assert_eq!(token_client.balance(&buyer), 10_000_000_000 - amount);

    // Contract should hold the 50 USDC.
    assert_eq!(token_client.balance(&contract_id), amount);

    // Buyer confirms delivery.
    client.confirm_delivery(&escrow_id);

    // Supplier should now have 50 USDC.
    assert_eq!(token_client.balance(&supplier), amount);

    // Contract balance should be zero.
    assert_eq!(token_client.balance(&contract_id), 0);
}

/// Test 2 (Edge case): Confirming an already-confirmed escrow should fail.
///
/// Once an escrow is settled, nobody should be able to confirm it again.
/// This prevents double-spend or double-release bugs.
#[test]
#[should_panic(expected = "Error(Contract, #3)")] // Error::AlreadySettled = 3
fn test_double_confirm_fails() {
    let (env, contract_id, token, buyer, supplier) = setup();
    let client = HatidPayContractClient::new(&env, &contract_id);

    let amount: i128 = 50_000_000;
    let deadline: u64 = 1_700_100_000;

    let escrow_id = client.create_escrow(&buyer, &supplier, &token, &amount, &deadline);

    // First confirm works.
    client.confirm_delivery(&escrow_id);

    // Second confirm should panic with AlreadySettled.
    client.confirm_delivery(&escrow_id);
}

/// Test 3 (State verification): After creating an escrow, the stored state
/// should accurately reflect the buyer, supplier, amount, deadline, and status.
#[test]
fn test_escrow_state_after_creation() {
    let (env, contract_id, token, buyer, supplier) = setup();
    let client = HatidPayContractClient::new(&env, &contract_id);

    let amount: i128 = 75_000_000; // 75 USDC
    let deadline: u64 = 1_700_200_000;

    let escrow_id = client.create_escrow(&buyer, &supplier, &token, &amount, &deadline);

    let escrow = client.get_escrow(&escrow_id);

    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.supplier, supplier);
    assert_eq!(escrow.token, token);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.deadline, deadline);
    assert_eq!(escrow.status, EscrowStatus::Created);
}

/// Test 4 (Edge case): Claiming expired escrow before deadline should fail.
///
/// The supplier shouldn't be able to grab funds while the delivery window
/// is still open. This protects the buyer.
#[test]
#[should_panic(expected = "Error(Contract, #4)")] // Error::NotExpired = 4
fn test_claim_before_deadline_fails() {
    let (env, contract_id, token, buyer, supplier) = setup();
    let client = HatidPayContractClient::new(&env, &contract_id);

    let amount: i128 = 50_000_000;
    let deadline: u64 = 1_700_500_000; // Way in the future from our ledger timestamp

    let escrow_id = client.create_escrow(&buyer, &supplier, &token, &amount, &deadline);

    // Supplier tries to claim before deadline — should panic.
    client.claim_expired(&escrow_id);
}

/// Test 5 (Dispute flow): Either party can raise a dispute, freezing the escrow.
///
/// After a dispute is raised, confirming delivery should fail because
/// the status is no longer "Created".
#[test]
fn test_dispute_freezes_escrow() {
    let (env, contract_id, token, buyer, supplier) = setup();
    let client = HatidPayContractClient::new(&env, &contract_id);

    let amount: i128 = 50_000_000;
    let deadline: u64 = 1_700_100_000;

    let escrow_id = client.create_escrow(&buyer, &supplier, &token, &amount, &deadline);

    // Buyer raises a dispute.
    client.raise_dispute(&escrow_id, &buyer);

    // Verify the escrow is now Disputed.
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);

    // Contract still holds the funds — nobody got paid.
    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&contract_id), amount);
    assert_eq!(token_client.balance(&supplier), 0);
}