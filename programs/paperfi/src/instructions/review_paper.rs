use anchor_lang::prelude::*;

use crate::state::{ UserAccount, Paper, Review };
use crate::errors::ErrorCode;
use crate::helpers::*;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct ReviewPaper<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
      mut,
      seeds = [b"user", signer.key().as_ref()],
      bump = reviewer_user_account.bump
    )]
    pub reviewer_user_account: Account<'info, UserAccount>, //to review they must sign up and create an account, no need for init_if_needed

    #[account(
      mut, 
      seeds = [b"user", paper.owner.as_ref()],
       bump = user_account.bump
      )]
    pub user_account: Account<'info, UserAccount>, //paper owner user account

    #[account(
    mut,
    seeds = [b"paper", paper.owner.as_ref(), &id.to_le_bytes()],
    bump = paper.bump
)]
    pub paper: Account<'info, Paper>,

    #[account(
        init,
        payer = signer,
        space = Review::INIT_SPACE,
        seeds = [b"review", signer.key().as_ref(), paper.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,

    pub system_program: Program<'info, System>,
}

impl<'info> ReviewPaper<'info> {
    //When selecting the paper to review, the client has the PDA info
    pub fn review_paper(&mut self, id: u64, verdict: Verdict, uri: String) -> Result<()> {
        //Paper owners can't review own papers
        require!(self.paper.owner.key() != self.signer.key(), ErrorCode::Unauthorized);

        let time = Clock::get()?.unix_timestamp as u64;
        //create review
        self.review.set_inner(Review {
            owner: self.signer.key(),
            paper: self.paper.key(),
            verdict: verdict.clone(),
            timestamp: time.clone(),
            review_uri: uri,
        });

        //update paper state
        let paper = &mut self.paper;
        paper.reviews += 1;
        paper.timestamp = time.clone();
        paper.review_status.update(&verdict);

        // Check rejection ratio - set to 20% for now
        if paper.review_status.rejection_ratio() > 20 {
            paper.listed = false;
        }

        //update user state
        self.reviewer_user_account.reviews += 1;
        self.reviewer_user_account.timestamp = time;

        Ok(())
    }
}
