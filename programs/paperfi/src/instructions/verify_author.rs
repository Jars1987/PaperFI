use anchor_lang::prelude::*;

use crate::state::{ Paper, PaperAuthor };
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct VerifyAuthor<'info> {
    #[account(mut)]
    pub author: Signer<'info>,

    #[account(
        mut,
        seeds = [b"author", paper_author.author.as_ref(), paper_author.paper.as_ref()],
        bump = paper_author.bump
    )]
    pub paper_author: Account<'info, PaperAuthor>,

    pub system_program: Program<'info, System>,
}

impl<'info> VerifyAuthor<'info> {
    pub fn verify_author(&mut self, id: u64) -> Result<()> {
        if !self.paper_author.verify {
            self.paper_author.verify = true;
        }
        Ok(())
    }
}
