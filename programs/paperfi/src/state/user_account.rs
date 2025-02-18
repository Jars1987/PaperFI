use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub name: String,
    pub title: String,
    pub purchases: u32,
    pub papers: u32, //published
    pub reviews: u32,
    pub owner: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
    pub timestamp: u64,
}

impl anchor_lang::Space for UserAccount {
    const INIT_SPACE: usize =
        8 + // Anchor discriminator
        (48 + 4) + // name (max 48 chars + prefix)
        (32 + 4) + // title (max 32 chars + prefix)
        4 + // purchases (u32)
        4 + // papers (u32)
        4 + // reviews (u32)
        32 + // owner (Pubkey)
        32 + // vault (Pubkey)
        1 + // bump (u8)
        1 + // vault_bump (u8)
        8; // timestamp (u64)
}
