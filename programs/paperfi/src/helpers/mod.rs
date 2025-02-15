use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

//--------------  Macro Rules  -------------------

#[macro_export]
macro_rules! validate_no_emojis {
    ($input:expr) => {
        require!(!contains_emoji($input), ErrorCode::EmojisNotAllowed);
    };
}

#[macro_export]
macro_rules! check_user_achievement {
    ($user_account:expr, $name:expr, $record:expr) => {
        match $name.as_str() {
            "papers" => {
                require!(
                    $user_account.papers >= $record,
                    ErrorCode::InvalidAchievement
                );
            }
            "reviews" => {
                require!(
                    $user_account.reviews >= $record,
                    ErrorCode::InvalidAchievement
                );
            }
            "purchases" => {
                require!(
                    $user_account.purchases >= $record,
                    ErrorCode::InvalidAchievement
                );
            }
            _ => {
                return Err(ErrorCode::UnknownBadge.into());
            }
        }
    };
}

// -------------  Helper functions ---------------

pub fn update_field(field: &mut String, new_value: Option<String>, max_len: usize) -> Result<()> {
    match new_value {
        Some(value) => {
            require!(value.len() < max_len, ErrorCode::InvalidFieldLength);
            require!(!value.is_empty(), ErrorCode::FieldIsEmpty);

            *field = value;
        }
        None => {}
    }
    Ok(())
}

pub fn update_numeric_field<T: Copy>(field: &mut T, new_value: Option<T>) -> Result<()> {
    match new_value {
        Some(value) => {
            *field = value;
        }
        None => {}
    }
    Ok(())
}

pub fn contains_emoji(input: &str) -> bool {
    input.chars().any(|c| {
        let c = c as u32;
        (c >= 0x1f600 && c <= 0x1f64f) || // Emoticons
            (c >= 0x1f300 && c <= 0x1f5ff) || // Misc Symbols & Pictographs
            (c >= 0x1f680 && c <= 0x1f6ff) || // Transport & Map
            (c >= 0x1f700 && c <= 0x1f77f) || // Alchemical Symbols
            (c >= 0x1f780 && c <= 0x1f7ff) || // Geometric Shapes Extended
            (c >= 0x1f800 && c <= 0x1f8ff) || // Supplemental Arrows-C
            (c >= 0x1f900 && c <= 0x1f9ff) || // Supplemental Symbols & Pictographs
            (c >= 0x1fa00 && c <= 0x1fa6f) || // Chess Symbols
            (c >= 0x1fa70 && c <= 0x1faff) || // Symbols and Pictographs Extended-A
            (c >= 0x2600 && c <= 0x26ff) || // Miscellaneous Symbols
            (c >= 0x2700 && c <= 0x27bf) || // Dingbats
            (c >= 0x2300 && c <= 0x23ff) || // Misc Technical
            c == 0x2b50 || // Star
            c == 0x3030 || // Wavy Dash
            c == 0x2b06 || // Up Arrow
            c == 0x2194 || // Left-Right Arrow
            c == 0x1f004 || // Mahjong Tile
            c == 0x1f0cf || // Joker
            c == 0x1f171 || // Negative Squared AB
            c == 0x1f18e || // Negative Squared NG
            (c >= 0x1f191 && c <= 0x1f19a) || // Squared Latin Letters
            (c >= 0x1f1e6 && c <= 0x1f1ff) || // Regional Indicator Symbols
            (c >= 0x24c2 && c <= 0x1f251) // Enclosed Characters
    })
}

// --------------- Helper Structs ------------------

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct EditUserParams {
    pub name: Option<String>,
    pub title: Option<String>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct CreateBadgeArgs {
    pub name: String,
    pub uri: String,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct PrintBadgeArgs {
    pub name: String,
    pub uri: String,
    pub achievement: String,
    pub record: u32,
    pub timestamp: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct EditPaperParams {
    pub paper_info_url: Option<String>,
    pub listed: Option<bool>,
    pub price: Option<u64>,
    pub version: Option<u32>,
    pub paper_uri: Option<String>,
}

// --------------------- ENUMS ----------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum Verdict {
    Approved,
    Rejected,
    ReviewRequested,
}

impl Space for Verdict {
    const INIT_SPACE: usize = 1; // 1 byte is enough for an enum with <= 256 variants
}
