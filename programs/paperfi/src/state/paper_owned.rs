use anchor_lang::prelude::*;

#[account]
pub struct PaperOwned {
    pub buyer: Pubkey, // The user who bought a copy of the paper
    pub paper: Pubkey, // The paper address of the paper being bought
    pub timestamp: u64, // Timestamp of ownership
    pub bump: u8,
}

impl Space for PaperOwned {
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1;
}
