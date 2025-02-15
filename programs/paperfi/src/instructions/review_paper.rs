use anchor_lang::prelude::*;

use crate::state::{ UserAccount, Paper, Review, PaperAuthor, PaperOwned };
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
    pub reviewer_user_account: Box<Account<'info, UserAccount>>, // Boxed

    #[account(
      mut, 
      seeds = [b"user", paper.owner.as_ref()],
       bump = user_account.bump
      )]
    pub user_account: Box<Account<'info, UserAccount>>, // Boxed

    #[account(
    mut,
    seeds = [b"paper", paper.owner.as_ref(), &id.to_le_bytes()],
    bump = paper.bump
    )]
    pub paper: Box<Account<'info, Paper>>, // Boxed

    #[account(seeds = [b"author", signer.key().as_ref(), paper.key().as_ref()], bump)]
    /// CHECKED : I will check this
    pub author_pda: UncheckedAccount<'info>,

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
    pub fn review_paper(&mut self, id: u64, verdict: Verdict, uri: String) -> Result<()> {
        //Paper owners can't review own papers
        require!(self.paper.owner.key() != self.signer.key(), ErrorCode::Unauthorized);

        //check data
        require!(self.author_pda.lamports() == 0, ErrorCode::Unauthorized);

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
