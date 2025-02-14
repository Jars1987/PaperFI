use anchor_lang::prelude::*;

use crate::state::{ Paper };
use crate::helpers::*;

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
