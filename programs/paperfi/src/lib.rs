pub mod errors;
pub mod instructions;
pub mod state;
pub mod helpers;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;
pub use helpers::*;

declare_id!("D1n8FqQcWH85gHNShcMhv8wWQMunYLoq6PAz7NtCwgaR");

#[program]
pub mod paperfi {
    use super::*;

    //Initialize PaperFI and Add Admin
    pub fn initialize(context: Context<Initialize>) -> Result<()> {
        context.accounts.generate_accounts(context.bumps)?;
        Ok(())
    }

    //Create new User
    pub fn signup(context: Context<NewUser>, name: String, title: String) -> Result<()> {
        context.accounts.new_user(name, title, context.bumps)?;
        Ok(())
    }

    //Change User Info
    pub fn edit_user(context: Context<EditUser>, params: EditUserParams) -> Result<()> {
        edit_user::edit_user(context, params)?;
        Ok(())
    }

    //Publish a Paper
    pub fn new_paper(
        context: Context<NewPaper>,
        _id: u64,
        paper_info_url: String,
        price: u64,
        uri: String
    ) -> Result<()> {
        context.accounts.new_paper(_id, paper_info_url, price, uri, &context.bumps)?;
        Ok(())
    }

    //Edit Paper Info
    pub fn edit_paper(context: Context<EditPaper>, _id: u64, params: EditPaperParams) -> Result<()> {
        //key value
        context.accounts.edit_paper(_id, params)?;
        Ok(())
    }

    //Add co-author
    pub fn new_author(context: Context<AddAuthor>, author: Pubkey, _id: u64) -> Result<()> {
        context.accounts.add_author(author, _id, &context.bumps)?;
        Ok(())
    }

    //Verify author
    pub fn verify(context: Context<VerifyAuthor>) -> Result<()> {
        context.accounts.verify_author()?;
        Ok(())
    }

    //Review a Published Paper
    pub fn review_paper(
        context: Context<ReviewPaper>,
        _id: u64,
        verdict: Verdict,
        uri: String
    ) -> Result<()> {
        context.accounts.review_paper(_id, verdict, uri)?;
        Ok(())
    }

    //Change Review Verdict
    pub fn edit_review(context: Context<EditReview>, _id: u64, verdict: Verdict) -> Result<()> {
        context.accounts.edit_review(_id, verdict)?;
        Ok(())
    }

    //Buy a Paper
    pub fn buy_paper(context: Context<BuyPaper>, _id: u64) -> Result<()> {
        context.accounts.buy_paper(_id, context.bumps.paper_owned)?;
        Ok(())
    }

    //User withdraw funds generated
    pub fn user_withdraw(context: Context<UserWithdraw>, vault_bump: u8) -> Result<()> {
        context.accounts.user_withdraw(vault_bump)?;
        Ok(())
    }

    //Admin withdraw funds generated
    pub fn admin_withdraw(context: Context<AdminWithdraw>) -> Result<()> {
        context.accounts.admin_withdraw()?;
        Ok(())
    }

    //Create a collection asset 
    pub fn make_badge(context: Context<MakeBadge>, args: CreateBadgeArgs) -> Result<()> {
        context.accounts.make_badge(args)?;
        Ok(())
    }

    //Print Editio Asset
    pub fn mint_achievement_nft(context: Context<PrintBadge>, args: PrintBadgeArgs) -> Result<()> {
        context.accounts.print_badge(args)?;
        Ok(())
    }
}