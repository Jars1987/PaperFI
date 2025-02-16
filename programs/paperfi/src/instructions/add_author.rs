use anchor_lang::prelude::*;

use crate::state::{ Paper, PaperAuthor };
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(author: Pubkey, id: u64)]
pub struct AddAuthor<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(seeds = [b"paper", owner.key().as_ref(), &id.to_le_bytes()], bump = paper.bump)]
    pub paper: Account<'info, Paper>,

    #[account(
        init,
        payer = owner,
        space = PaperAuthor::INIT_SPACE,
        seeds = [b"author", author.as_ref(), paper.key().as_ref()],
        bump
    )]
    pub paper_author: Account<'info, PaperAuthor>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddAuthor<'info> {
    pub fn add_author(&mut self, author: Pubkey, id: u64, bump: &AddAuthorBumps) -> Result<()> {
        require!(self.paper.owner == self.owner.key(), ErrorCode::Unauthorized);

        self.paper_author.set_inner(PaperAuthor {
            author,
            paper: self.paper.key(),
            verify: false,
            bump: bump.paper_author,
        });
        Ok(())
    }
}
