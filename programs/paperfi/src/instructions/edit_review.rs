use anchor_lang::prelude::*;

use crate::state::{ Paper, Review };
use crate::errors::ErrorCode;
use crate::helpers::*;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct EditReview<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
    mut,
    seeds = [b"paper", paper.owner.as_ref(), &id.to_le_bytes()],
    bump = paper.bump
)]
    pub paper: Account<'info, Paper>,

    #[account(seeds = [b"review", signer.key().as_ref(), paper.key().as_ref()], bump)]
    pub review: Account<'info, Review>,

    pub system_program: Program<'info, System>,
}

impl<'info> EditReview<'info> {
    pub fn edit_review(&mut self, id: u64, verdict: Verdict) -> Result<()> {
        //update verdict
        self.review.verdict = verdict.clone();
        self.review.timestamp = Clock::get()?.unix_timestamp as u64;

        //update Review Status
        self.paper.review_status.update(&verdict);
        self.paper.timestamp = Clock::get()?.unix_timestamp as u64;

        if verdict == Verdict::Approved && self.paper.listed == false {
            self.paper.listed = true;
        }

        Ok(())
    }
}
