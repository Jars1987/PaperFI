use anchor_lang::prelude::*;

#[account]
pub struct PaperFiConfig {
    pub admins: Vec<Pubkey>, // Max 3 admins
    pub fee: Option<u8>, //to be able to check if it is set
    pub bump: u8,
    pub vault_bump: u8,
}

impl PaperFiConfig {
    pub const MAX_ADMINS: usize = 3;
    pub const INIT_SPACE: usize = 8 + Self::MAX_ADMINS * 32 + 1 + 1 + 1; // 8 (discriminator) + 3 * pubkey (32) + 1 fee + 1 bump + 1 bump;
}
