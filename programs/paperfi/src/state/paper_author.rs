use anchor_lang::prelude::*;

#[account]
pub struct PaperAuthor {
    pub author: Pubkey, // The user who bought a copy of the paper
    pub paper: Pubkey, // The paper address of the paper being bought
    pub verify: bool,
    pub bump: u8,
}

impl Space for PaperAuthor {
    const INIT_SPACE: usize = 8 + 32 + 32 + 1 + 1;
}
