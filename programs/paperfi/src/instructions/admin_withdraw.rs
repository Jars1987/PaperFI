use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };
use crate::errors::ErrorCode;
use crate::state::{ PaperFiConfig };

#[derive(Accounts)]
pub struct AdminWithdraw<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"config_vault", config.key().as_ref()], bump = config.vault_bump)]
    pub config_vault: SystemAccount<'info>,

    #[account(seeds = [b"paperfi_config"], bump = config.bump)]
    pub config: Account<'info, PaperFiConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> AdminWithdraw<'info> {
    pub fn admin_withdraw(&mut self) -> Result<()> {
        require!(self.config.admins.contains(&self.admin.key()), ErrorCode::Unauthorized);

        let vault_balance = self.config_vault.lamports();

        require!(vault_balance > 0, ErrorCode::InsufficientFunds);

        let config_seed = self.config.key();
        let seeds = &[b"config_vault", config_seed.as_ref(), &[self.config.vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.config.to_account_info(),
            to: self.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        transfer(cpi_ctx, vault_balance)?;

        Ok(())
    }
}
