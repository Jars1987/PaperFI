use anchor_lang::prelude::*;

use crate::state::{ Paper };
use crate::helpers::*;
use crate::errors::ErrorCode;
use crate::{ validate_no_emojis };
use crate::contains_emoji;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct EditPaper<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [b"paper", owner.key().as_ref(), &id.to_le_bytes()],
    bump = paper.bump
)]
    pub paper: Account<'info, Paper>,

    pub system_program: Program<'info, System>,
}

impl<'info> EditPaper<'info> {
    pub fn edit_paper(&mut self, id: u64, params: EditPaperParams) -> Result<()> {
        let paper = &mut self.paper;
        update_field(&mut paper.paper_info_url, params.paper_info_url, 200)?;
        update_field(&mut paper.paper_uri, params.paper_uri, 200)?;
        update_numeric_field(&mut paper.price, params.price)?;
        update_numeric_field(&mut paper.version, params.version)?;

        //Since the fileds are optional lets make the requirement after the change (solana atomic)
        //if there was a change that doesn't respect the requirements tx will fail and change wont happen
        require!(paper.price == 0 || paper.price >= 1_000_000, ErrorCode::IncorrectPricing);
        validate_no_emojis!(&paper.paper_info_url);
        validate_no_emojis!(&paper.paper_uri);

        match params.listed {
            Some(listed) => {
                paper.listed = listed;
            }
            None => {} // Do nothing if there's no new value
        }

        paper.timestamp = Clock::get()?.unix_timestamp as u64;

        Ok(())
    }
}
