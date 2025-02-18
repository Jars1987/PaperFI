use anchor_lang::prelude::*;
use mpl_core::{
    self,
    ID as MPL_CORE_ID,
    instructions::{ CreateCollectionV2CpiBuilder },
    types::{
        Attribute,
        Attributes,
        Plugin,
        PluginAuthority,
        PluginAuthorityPair,
        MasterEdition,
    },
};
use crate::state::{ PaperFiConfig };
use crate::errors::ErrorCode;
use crate::helpers::*;

#[derive(Accounts)]
pub struct MakeBadge<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, //payer

    //will be transformed into a Core Collection Account during this instruction.
    #[account(mut)]
    pub badge: Signer<'info>, //collection

    #[account(seeds = [b"paperfi_config"], bump = config.bump)]
    pub config: Account<'info, PaperFiConfig>, //update authority

    #[account(address = MPL_CORE_ID)]
    /// CHECK: this account is checked by the address constraint
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> MakeBadge<'info> {
    pub fn make_badge(&mut self, args: CreateBadgeArgs) -> Result<()> {
        // Ensure the signer is an approved admin
        require!(self.config.admins.contains(&self.admin.key()), ErrorCode::Unauthorized);

        //Lets create a vector to hold our plugins to freeze the assets
        let mut collection_plugins: Vec<PluginAuthorityPair> = vec![];

        let attribute_list: Vec<Attribute> = vec![
            Attribute {
                key: "name".to_string(),
                value: args.name.clone(),
            },
            Attribute {
                key: "uri".to_string(),
                value: args.uri.clone(),
            }
        ];

        //note, we need better implementation besides keeping cloning
        let master_editon = MasterEdition {
            max_supply: None, //---> Better ignore this to have unlimited supply
            name: Some(args.name.clone()),
            uri: Some(args.uri.clone()),
        };

        //Add attributes as additional data
        collection_plugins.push(PluginAuthorityPair {
            plugin: Plugin::Attributes(Attributes { attribute_list }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        //add Master Edition to print editions
        collection_plugins.push(PluginAuthorityPair {
            plugin: Plugin::MasterEdition(master_editon),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        //Create the collection asset
        CreateCollectionV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .collection(&self.badge.to_account_info())
            .payer(&self.admin.to_account_info())
            .update_authority(Some(&self.config.as_ref()))
            .system_program(&self.system_program.to_account_info())
            .name(args.name)
            .uri(args.uri)
            .plugins(collection_plugins) //the plugins you wanted to add to the collection - Optional line
            .invoke()?;

        Ok(())
    }
}
