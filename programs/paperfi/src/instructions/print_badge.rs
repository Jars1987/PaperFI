use anchor_lang::prelude::*;
use mpl_core::{
    ID as MPL_CORE_ID,
    instructions::{ CreateV2CpiBuilder },
    accounts::{ BaseCollectionV1 },
    types::{
        Attribute,
        Attributes,
        PermanentFreezeDelegate,
        Edition,
        Plugin,
        PluginAuthority,
        PluginAuthorityPair,
    },
};
use crate::state::{ UserAccount, PaperFiConfig };
use crate::errors::ErrorCode;
use crate::check_user_achievement;
use crate::helpers::*;

#[derive(Accounts)]
pub struct PrintBadge<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [b"user", user.key().as_ref()], bump = user_account.bump)]
    pub user_account: Account<'info, UserAccount>,

    #[account(seeds = [b"paperfi_config"], bump = config.bump)]
    pub config: Account<'info, PaperFiConfig>, //update authority

    #[account(
       mut,
       constraint = collection.update_authority == config.key(),
   )]
    pub collection: Account<'info, BaseCollectionV1>,

    #[account(mut)]
    pub asset: Signer<'info>, //asset will be transformed into a Core Collection Account during this instruction

    #[account(address = MPL_CORE_ID)]
    /// CHECK: This is checked by the address constraint
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> PrintBadge<'info> {
    pub fn print_badge(&mut self, args: PrintBadgeArgs) -> Result<()> {
        check_user_achievement!(self.user_account, args.name, args.record);

        let mut edition_plugin: Vec<PluginAuthorityPair> = vec![];

        let attribute_list: Vec<Attribute> = vec![
            Attribute {
                key: "achievement".to_string(),
                value: args.achievement,
            },
            Attribute {
                key: "record".to_string(),
                value: args.record.to_string(),
            },
            Attribute {
                key: "timestamp".to_string(),
                value: Clock::get()?.unix_timestamp.to_string(),
            }
        ];

        edition_plugin.push(PluginAuthorityPair {
            plugin: Plugin::Attributes(Attributes { attribute_list }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        edition_plugin.push(PluginAuthorityPair {
            plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        edition_plugin.push(PluginAuthorityPair {
            plugin: Plugin::Edition(Edition {
                number: 1,
            }),
            authority: None,
        });

        let signer_seeds: &[&[u8]] = &[b"paperfi_config", &[self.config.bump]];

        // Cannot specify both an update authority and collection on an asset so we don't pass the update authority
        CreateV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .authority(Some(&self.config.to_account_info())) //no need as the authority is the signer
            .payer(&self.user.to_account_info())
            .owner(Some(&self.user.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .name(args.name)
            .uri(args.uri)
            .plugins(edition_plugin)
            .invoke_signed(&[signer_seeds])?; //update authority is config so we need invoke with seeds
        Ok(())
    }
}
