use anchor_lang::prelude::*;
use crate::state::{ PaperFiConfig };
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [b"config_vault", config.key().as_ref()], bump)]
    pub config_vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = PaperFiConfig::INIT_SPACE,
        seeds = [b"paperfi_config"],
        bump
    )]
    pub config: Account<'info, PaperFiConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn generate_accounts(&mut self, bumps: InitializeBumps) -> Result<()> {
        let config = &mut self.config;

        // Enforce max 3 admins
        require!(config.admins.len() < PaperFiConfig::MAX_ADMINS, ErrorCode::TooManyAdmins);

        // Check if the admin is already in the list
        let is_admin_already_added = config.admins.iter().any(|admin| admin == &self.admin.key());
        require!(!is_admin_already_added, ErrorCode::AdminAlreadyExists);

        config.admins.push(self.admin.key());

        //Check if confi has been initalized by checking the fee
        if config.fee.is_none() {
            config.fee = Some(2); // 2% - for now this is fixed
            config.bump = bumps.config;
            config.vault_bump = bumps.config_vault;
        }

        Ok(())
    }
}
