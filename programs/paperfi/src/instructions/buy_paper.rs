use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };
use crate::state::{ Paper, UserAccount, PaperOwned, PaperFiConfig };
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(_id: u64)]
pub struct BuyPaper<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
      mut,
      seeds = [b"user", buyer.key().as_ref()],
      bump = buyer_user_account.bump
    )]
    pub buyer_user_account: Box<Account<'info, UserAccount>>, //already init, to use the platform must signup therefore user already exists

    #[account(seeds = [b"user", paper.owner.as_ref()], bump = user_account.bump)]
    pub user_account: Box<Account<'info, UserAccount>>, //paper owner user account

    #[account(mut, seeds = [b"user_vault", paper.owner.as_ref()], bump = user_account.vault_bump)]
    pub user_vault: SystemAccount<'info>,

    #[account(mut, seeds = [b"paperfi_config"], bump = config.bump)]
    pub config: Box<Account<'info, PaperFiConfig>>,

    #[account(mut, seeds = [b"config_vault", config.key().as_ref()], bump = config.vault_bump)]
    pub config_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"paper", paper.owner.as_ref(), &_id.to_le_bytes()], // ** Check foot notes
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

    #[account(seeds = [b"author", buyer.key().as_ref(), paper.key().as_ref()], bump)]
    /// CHECKED : Intruction check this
    pub author_pda: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> BuyPaper<'info> {
    pub fn buy_paper(&mut self, _id: u64, bump: u8) -> Result<()> {
        //Publishers already own the papers
        require!(self.buyer.key() != self.paper.owner, ErrorCode::PublisherCantBuy);

        //create PaperOwned (proof of purchase)
        self.paper_owned.set_inner(PaperOwned {
            buyer: self.buyer.key(),
            paper: self.paper.key(),
            timestamp: Clock::get()?.unix_timestamp as u64,
            bump,
        });

        //Check if buyer is an author
        let is_author: bool = !self.author_pda.to_account_info().data_is_empty();

        //Check if the paper has a price and not author
        if self.paper.price > 0 && !is_author {
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = Transfer {
                from: self.buyer.to_account_info().clone(),
                to: self.user_vault.to_account_info(),
            };

            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            //Pay the paper owner
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
            //Pays the fees to PaperFi
            transfer(cpi_ctx_2, fee_amount)?;
        }

        //register sales in the paper state
        self.paper.sales += 1;

        //register purchase in the buyer user_account state
        self.buyer_user_account.purchases += 1;

        Ok(())
    }
}
