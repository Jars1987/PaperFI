use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub name: String,
    pub title: String,
    pub purchases: u32,
    pub papers: u32, //published
    pub reviews: u32,
    pub owner: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
    pub timestamp: u64,
    // [max_len(48)]
    // institution: String,
}

impl anchor_lang::Space for UserAccount {
    const INIT_SPACE: usize =
        8 + // Anchor discriminator
        (48 + 4) + // name (max 48 chars + prefix)
        (32 + 4) + // title (max 32 chars + prefix)
        4 + // purchases (u32)
        4 + // papers (u32)
        4 + // reviews (u32)
        32 + // owner (Pubkey)
        32 + // vault (Pubkey)
        1 + // bump (u8)
        1 + // vault_bump (u8)
        8; // timestamp (u64)
}

/*
//COONECTING PAPERS BOUGHt WITH USERS BY PDAS:

STATE PDA

#[account]
#[derive(InitSpace)]
pub struct PaperOwned {
    pub user: Pubkey,       // The user who owns the paper
    pub paper: Pubkey,      // The paper being owned
    pub timestamp: u64,     // Timestamp of ownership
}


//When a user purchases or publishes a paper, we create a PaperOwned PDA account. 
//The PDA can be derived using a combination of the user's public key and the paper's public key as seeds.

Front end:
//retrieve all papers owned by a user. Query the PaperOwned accounts using the user's public key as a filter.

//ANCHOR PROGRAM
let discriminator = anchor_lang::sighash("account:PaperOwned");
msg!("PaperOwned Discriminator: {:?}", PaperOwned::DISCRIMINATOR);

//Or get Discriminator from the IDL

//FRONT END
async function getPapersOwnedByUser(userPubkey) {

    const descriminator = bs58.encode(Buffer.from(/* Your 8-byte discriminator */));

    const filters = [
    {
        memcmp: {
            offset: 0, // First 8 bytes are the discriminator
            bytes: discriminator,
        },
    },
    {
        memcmp: {
            offset: 8, // User's Pubkey follows the discriminator
            bytes: userPubkey.toBase58(),
        },
    },
];

    const accounts = await connection.getProgramAccounts(programId, {
        filters,
    });

    return accounts.map((account) => {
        const data = PaperOwned.decode(account.account.data); // Decode data
        return {
            paper: new PublicKey(data.paper), // The paper's public key
            timestamp: data.timestamp, // Ownership timestamp
        };
    });
}

 */
