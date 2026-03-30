#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    token, Address, Env,
};

/// Storage keys for the contract's persistent data.
#[contracttype]
pub enum DataKey {
    /// The next escrow ID to assign. Auto-increments.
    NextId,
    /// Maps an escrow ID to its Escrow struct.
    Escrow(u64),
}

/// Represents the current state of an escrow.
/// An escrow moves through: Created -> (Confirmed | Expired | Disputed)
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    /// Funds are locked. Waiting for buyer to confirm delivery.
    Created,
    /// Buyer confirmed delivery. Funds released to supplier.
    Confirmed,
    /// Deadline passed without confirmation. Supplier can claim.
    Expired,
    /// A dispute was raised. Funds are frozen until resolution.
    Disputed,
}

/// The escrow record stored on-chain.
/// Each escrow ties a buyer, a supplier, a token, an amount, and a deadline together.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub buyer: Address,
    pub supplier: Address,
    pub token: Address,
    /// Amount in the token's smallest unit (e.g. 50_000_000 = 50 USDC with 7 decimals).
    pub amount: i128,
    /// Ledger timestamp (unix seconds) after which the escrow expires.
    pub deadline: u64,
    pub status: EscrowStatus,
}

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The escrow ID doesn't exist.
    NotFound = 1,
    /// The caller isn't authorized for this action.
    Unauthorized = 2,
    /// The escrow has already been confirmed, expired, or disputed — can't act on it.
    AlreadySettled = 3,
    /// The escrow hasn't expired yet, so you can't claim via expiry.
    NotExpired = 4,
    /// The amount must be greater than zero.
    InvalidAmount = 5,
}

#[contract]
pub struct HatidPayContract;

#[contractimpl]
impl HatidPayContract {
    /// Creates a new escrow and locks the buyer's funds in the contract.
    ///
    /// This is the main entry point. The buyer calls this with the supplier's address,
    /// the USDC token contract, the amount, and a deadline timestamp. The contract
    /// transfers the tokens from the buyer into itself and stores the escrow record.
    ///
    /// Returns the escrow ID.
    pub fn create_escrow(
        env: Env,
        buyer: Address,
        supplier: Address,
        token: Address,
        amount: i128,
        deadline: u64,
    ) -> Result<u64, Error> {
        // Buyer must authorize this call (they're the one paying).
        buyer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get the next escrow ID and increment it.
        let escrow_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(escrow_id + 1));

        // Transfer tokens from buyer to this contract.
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &contract_address, &amount);

        // Store the escrow.
        let escrow = Escrow {
            buyer,
            supplier,
            token,
            amount,
            deadline,
            status: EscrowStatus::Created,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(escrow_id)
    }

    /// Buyer confirms delivery. This releases the locked funds to the supplier.
    ///
    /// Only the buyer can call this. The escrow must still be in "Created" status.
    /// Once confirmed, the contract transfers the full amount to the supplier.
    pub fn confirm_delivery(env: Env, escrow_id: u64) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)?;

        // Only the buyer can confirm.
        escrow.buyer.require_auth();

        if escrow.status != EscrowStatus::Created {
            return Err(Error::AlreadySettled);
        }

        // Release funds to supplier.
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&contract_address, &escrow.supplier, &escrow.amount);

        // Update status.
        escrow.status = EscrowStatus::Confirmed;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(())
    }

    /// Claim funds after the escrow deadline has passed.
    ///
    /// If the buyer never confirmed and the deadline is past, the supplier can call
    /// this to release the funds to themselves. This prevents funds from being locked
    /// forever if the buyer goes silent.
    pub fn claim_expired(env: Env, escrow_id: u64) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)?;

        escrow.supplier.require_auth();

        if escrow.status != EscrowStatus::Created {
            return Err(Error::AlreadySettled);
        }

        // Check that the deadline has actually passed.
        let now = env.ledger().timestamp();
        if now < escrow.deadline {
            return Err(Error::NotExpired);
        }

        // Release to supplier.
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&contract_address, &escrow.supplier, &escrow.amount);

        escrow.status = EscrowStatus::Expired;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(())
    }

    /// Raise a dispute on an active escrow. Either buyer or supplier can call this.
    ///
    /// This freezes the escrow — no one can withdraw. In a real production system,
    /// this would kick off an off-chain arbitration process. For the hackathon MVP,
    /// it just flips the status to Disputed.
    pub fn raise_dispute(env: Env, escrow_id: u64, caller: Address) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)?;

        caller.require_auth();

        // Only buyer or supplier can dispute.
        if caller != escrow.buyer && caller != escrow.supplier {
            return Err(Error::Unauthorized);
        }

        if escrow.status != EscrowStatus::Created {
            return Err(Error::AlreadySettled);
        }

        escrow.status = EscrowStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(())
    }

    /// Read-only: get the current state of an escrow.
    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<Escrow, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)
    }
}

#[cfg(test)]
mod test;