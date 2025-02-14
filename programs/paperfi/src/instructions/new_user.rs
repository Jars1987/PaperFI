use anchor_lang::prelude::*;

use crate::state::UserAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct NewUser<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = UserAccount::INIT_SPACE,
        seeds = [b"user", signer.key().as_ref()],
        bump
    )]
    pub user: Account<'info, UserAccount>,

    #[account(seeds = [b"user_vault", signer.key().as_ref()], bump)]
    pub user_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> NewUser<'info> {
    pub fn new_user(&mut self, name: String, title: String, bumps: NewUserBumps) -> Result<()> {
        require!(name.len() < 49 || title.len() < 33, ErrorCode::InvalidFieldLength);
        require!(!name.is_empty() && !title.is_empty(), ErrorCode::FieldIsEmpty);

        self.user.set_inner(UserAccount {
            name,
            title,
            purchases: 0,
            papers: 0,
            reviews: 0,
            owner: self.signer.key(),
            bump: bumps.user,
            vault_bump: bumps.user_vault,
            timestamp: Clock::get()?.unix_timestamp as u64,
        });
        Ok(())
    }
}
