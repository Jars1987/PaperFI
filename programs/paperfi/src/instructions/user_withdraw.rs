use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(vault_bump: u8)]
pub struct UserWithdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [b"user_vault", user.key().as_ref()], bump = vault_bump)]
    pub user_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> UserWithdraw<'info> {
    pub fn user_withdraw(&mut self, vault_bump: u8) -> Result<()> {
        //In future releases we might pass an amount as an instruction argument for partial withdrawals

        let vault_balance = self.user_vault.lamports();
        require!(vault_balance > 0, ErrorCode::InsufficientFunds);
        let user_seed = self.user.key();
        let seeds = &[b"user_vault", user_seed.as_ref(), &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.user_vault.to_account_info(),
            to: self.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        transfer(cpi_ctx, vault_balance)?;

        Ok(())
    }
}
