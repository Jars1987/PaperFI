use anchor_lang::prelude::*;
use crate::state::{ Paper, UserAccount, ReviewStatus, PaperAuthor };
use crate::errors::ErrorCode;
use crate::{ validate_no_emojis };
use crate::contains_emoji;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct NewPaper<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, seeds = [b"user", owner.key().as_ref()], bump = user_account.bump)]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = owner,
        space = Paper::INIT_SPACE,
        seeds = [b"paper", owner.key().as_ref(), &id.to_le_bytes()], // ** Check foot notes
        bump
    )]
    pub paper: Account<'info, Paper>,

    #[account(
        init,
        payer = owner,
        space = PaperAuthor::INIT_SPACE,
        seeds = [b"author", owner.key().as_ref(), paper.key().as_ref()],
        bump
    )]
    pub paper_author: Account<'info, PaperAuthor>,

    pub system_program: Program<'info, System>,
}

impl<'info> NewPaper<'info> {
    pub fn new_paper(
        &mut self,
        id: u64,
        paper_info_url: String,
        price: u64,
        uri: String,
        bump: &NewPaperBumps
    ) -> Result<()> {
        //Is this safeguard needed?
        validate_no_emojis!(&paper_info_url);
        validate_no_emojis!(&uri);

        //Ensure price is either free (0) or in minimum lamports (0.001 Sol)
        require!(price == 0 || price >= 1_000_000, ErrorCode::IncorrectPricing);

        //default Review status
        let review_status = ReviewStatus {
            approved: 0,
            rejected: 0,
            review_requested: 0,
        };

        //set paper
        self.paper.set_inner(Paper {
            paper_info_url,
            owner: self.owner.key(),
            review_status,
            version: 1,
            listed: true,
            price,
            bump: bump.paper,
            user_bump: self.user_account.bump, //looks like anchor does not track the bumps if we derivate the bump from state in the context accounts
            reviews: 0,
            sales: 0,
            timestamp: Clock::get().unwrap().unix_timestamp as u64,
            paper_uri: uri,
        });

        self.user_account.papers += 1;
        self.user_account.timestamp = Clock::get()?.unix_timestamp as u64;

        //set author
        self.paper_author.set_inner(PaperAuthor {
            author: self.owner.key(),
            paper: self.paper.key(),
            verify: true,
            bump: bump.paper_author,
        });

        Ok(())
    }
}

/*
//---Foot notes---

1- We could use the title argument passed from the instructions and use it as seed: &title.as_bytes()[..title.len().min(32) but the owner might want to change the title 

*/
