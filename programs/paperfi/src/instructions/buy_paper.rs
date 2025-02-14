use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };
use crate::state::{ Paper, UserAccount, PaperOwned, PaperFiConfig };
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct BuyPaper<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
      mut,
      seeds = [b"user", buyer.key().as_ref()],
      bump = buyer_user_account.bump
    )]
    pub buyer_user_account: Box<Account<'info, UserAccount>>, //already init, to use the platform must signup therefore user already exists

    #[account(mut, seeds = [b"user", paper.owner.as_ref()], bump = user_account.bump)]
    pub user_account: Box<Account<'info, UserAccount>>, //paper owner user account

    #[account(seeds = [b"user_vault", paper.owner.as_ref()], bump = user_account.vault_bump)]
    pub user_vault: SystemAccount<'info>,

    #[account(seeds = [b"paperfi_config"], bump = config.bump)]
    pub config: Box<Account<'info, PaperFiConfig>>,

    #[account(seeds = [b"config_vault", config.key().as_ref()], bump = config.vault_bump)]
    pub config_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"paper", paper.owner.as_ref(), &id.to_le_bytes()], // ** Check foot notes
        bump = paper.bump
    )]
    pub paper: Box<Account<'info, Paper>>,

    #[account(
        init,
        payer = buyer,
        space = PaperOwned::INIT_SPACE,
        seeds = [b"purchase", buyer.key().as_ref(), paper.key().as_ref()],
        bump
    )]
    pub paper_owned: Account<'info, PaperOwned>,

    pub system_program: Program<'info, System>,
}

impl<'info> BuyPaper<'info> {
    pub fn buy_paper(&mut self, _id: u64, bump: u8) -> Result<()> {
        //create PaperOwned
        self.paper_owned.set_inner(PaperOwned {
            buyer: self.buyer.key(),
            paper: self.paper.key(),
            timestamp: Clock::get()?.unix_timestamp as u64,
            bump,
        });

        //Transfer paper price amount from buyer to user vault
        if self.paper.price > 0 {
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = Transfer {
                from: self.buyer.to_account_info().clone(),
                to: self.user_vault.to_account_info(),
            };

            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            transfer(cpi_ctx, self.paper.price)?;

            //get fee percentage
            let fee_percentage = self.config.fee.unwrap_or(0) as u64;

            //Calculate price of fees and transfer fee from buyer to admin vault
            let total_amout = self.paper.price
                .checked_mul(100u64 + fee_percentage)
                .ok_or(ErrorCode::MathOverflow)?;

            let fee_amount = total_amout.checked_div(100).ok_or(ErrorCode::MathOverflow)?;

            let cpi_accounts_2 = Transfer {
                from: self.buyer.to_account_info(),
                to: self.config_vault.to_account_info(),
            };

            let cpi_ctx_2 = CpiContext::new(self.system_program.to_account_info(), cpi_accounts_2);
            transfer(cpi_ctx_2, fee_amount)?;
        }

        //register sales in the paper state

        self.paper.sales += 1;

        //register purchase in the buyer user_account state
        self.buyer_user_account.purchases += 1;

        Ok(())
    }
}

/*
Note:

In future instead of using the Owner in the Paper PDA we can provide a list of the co-authors in the instructions, 
verify that they are indeed co-authors through Author Paper account verification and share the sell percentage through
all the user accounts verified
*/
