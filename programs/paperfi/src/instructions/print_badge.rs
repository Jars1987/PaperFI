use anchor_lang::prelude::*;
use mpl_core::{
    ID as MPL_CORE_ID,
    fetch_external_plugin_adapter_data_info,
    fetch_plugin,
    instructions::{ CreateV2CpiBuilder },
    accounts::{ BaseCollectionV1 },
    types::{
        Attribute,
        Attributes,
        UpdateAuthority,
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
    pub config: Account<'info, PaperFiConfig>,

    #[account(
       mut,
       constraint = badge.update_authority == config.key(),
   )]
    pub badge: Account<'info, BaseCollectionV1>,

    #[account(mut)]
    pub print: Signer<'info>, //will be transformed into a Core Collection Account during this instruction

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
                value: args.timestamp.to_string(),
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

        // Create the Ticket
        CreateV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.print.to_account_info())
            .collection(Some(&self.badge.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(Some(&self.config.to_account_info()))
            .owner(Some(&self.user.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .name(args.name)
            .uri(args.uri)
            .plugins(edition_plugin)
            .invoke_signed(&[signer_seeds])?;

        Ok(())
    }
}
