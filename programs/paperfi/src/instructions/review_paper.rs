use anchor_lang::prelude::*;

use crate::state::{ UserAccount, Paper, Review, PaperOwned };
use crate::errors::ErrorCode;
use crate::helpers::*;

#[derive(Accounts)]
#[instruction(_id: u64)]
pub struct ReviewPaper<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
      mut,
      seeds = [b"user", signer.key().as_ref()],
      bump = reviewer_user_account.bump
    )]
    pub reviewer_user_account: Box<Account<'info, UserAccount>>, // Boxed

    #[account(
      mut, 
      seeds = [b"user", paper.owner.as_ref()],
       bump = user_account.bump
      )]
    pub user_account: Box<Account<'info, UserAccount>>, // Boxed

    #[account(
    mut,
    seeds = [b"paper", paper.owner.as_ref(), &_id.to_le_bytes()],
    bump = paper.bump
    )]
    pub paper: Box<Account<'info, Paper>>, // Boxed

    #[account(seeds = [b"author", signer.key().as_ref(), paper.key().as_ref()], bump)]
    /// CHECKED : I will check this
    pub paper_author: UncheckedAccount<'info>,

    #[account(
        seeds = [b"purchase", signer.key().as_ref(), paper.key().as_ref()],
        bump = paper_owned.bump
    )]
    pub paper_owned: Box<Account<'info, PaperOwned>>, // Boxed

    #[account(
        init,
        payer = signer,
        space = Review::INIT_SPACE,
        seeds = [b"review", signer.key().as_ref(), paper.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>, // Box to?

    pub system_program: Program<'info, System>,
}

impl<'info> ReviewPaper<'info> {
    //When selecting the paper to review, the client has the PDA info
    pub fn review_paper(&mut self, _id: u64, verdict: Verdict, uri: String) -> Result<()> {
        //Paper owners can't review own papers
        require!(self.paper.owner.key() != self.signer.key(), ErrorCode::Unauthorized);

        //check that author account doesn't exist by checking that the PDA has no data, authors can't review their own papers
        require!(self.paper_author.to_account_info().data_is_empty(), ErrorCode::Unauthorized);

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

        let ratio = paper.review_status.rejection_ratio();
        msg!("Rejection ratio before if statement: {}", ratio);

        if ratio > 20 {
            paper.listed = false;
        }

        let user = &mut self.reviewer_user_account;
        //update user state
        user.reviews += 1;
        user.timestamp = time;

        Ok(())
    }
}
