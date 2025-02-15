use anchor_lang::prelude::*;
use crate::state::UserAccount;
use crate::errors::ErrorCode;
use crate::helpers::*;

#[derive(Accounts)]
pub struct EditUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut, 
        seeds = [b"user", owner.key().as_ref()],
         bump = user.bump
        )]
    pub user: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
}

pub fn edit_user(ctx: Context<EditUser>, params: EditUserParams) -> Result<()> {
    let user = &mut ctx.accounts.user;

    update_field(&mut user.name, params.name, 49)?;
    update_field(&mut user.title, params.title, 33)?;

    user.timestamp = Clock::get()?.unix_timestamp as u64;

    Ok(())
}
