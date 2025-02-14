use anchor_lang::prelude::*;

#[account]
pub struct Admin {
    pub owner: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Space for Admin {
    const INIT_SPACE: usize = 8 + 32 + 1 + 1;
}
