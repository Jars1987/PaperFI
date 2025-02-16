use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Exceeded the field length allowed")]
    InvalidFieldLength,
    #[msg("Must provide a name and a title")]
    FieldIsEmpty,
    #[msg("The input string contains emojis, which are not allowed")]
    EmojisNotAllowed,
    #[msg("Something went wrong. Mathoverflow!")]
    MathOverflow,
    #[msg("Vault is empty.")]
    InsufficientFunds,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("You have not reached the required achievement level for this badge.")]
    InvalidAchievement,
    #[msg("Unknown badge type.")]
    UnknownBadge,
    #[msg("Max Admins allowed have been reached")]
    TooManyAdmins,
    #[msg("Prince can't be negative")]
    IncorrectPricing,
    #[msg("New version can't be lower than the previous version")]
    InvalidVersion,
    #[msg("Admin account already generated")]
    AdminAlreadyExists,
    #[msg("A publisher can't by a paper that he already owns")]
    PublisherCantBuy,
}
