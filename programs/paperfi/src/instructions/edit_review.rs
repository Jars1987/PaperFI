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

    #[account(mut, seeds = [b"review", signer.key().as_ref(), paper.key().as_ref()], bump)]
    pub review: Account<'info, Review>,

    pub system_program: Program<'info, System>,
}

impl<'info> EditReview<'info> {
    pub fn edit_review(&mut self, id: u64, verdict: Verdict) -> Result<()> {
        // Check if the previous verdict was `ReviewRequested`
        if self.review.verdict == Verdict::ReviewRequested {
            // If previous verdict was `ReviewRequested`, decrement the count
            self.paper.review_status.review_requested -= 1;
        }

        // Update the review verdict and timestamp
        self.review.verdict = verdict.clone();
        self.review.timestamp = Clock::get()?.unix_timestamp as u64;

        //update Review Status based on the new verdict
        self.paper.review_status.update(&verdict);
        self.paper.timestamp = Clock::get()?.unix_timestamp as u64;

        // If the paper is approved and not already listed, mark it as listed
        if verdict == Verdict::Approved && self.paper.listed == false {
            self.paper.listed = true;
        }

        Ok(())
    }
}
