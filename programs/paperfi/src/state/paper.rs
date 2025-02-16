use anchor_lang::prelude::*;
use crate::helpers::Verdict;
#[account]
pub struct Paper {
    pub paper_info_url: String,
    pub version: u32,
    pub owner: Pubkey,
    pub listed: bool,
    pub price: u64,
    pub bump: u8,
    pub user_bump: u8,
    pub reviews: u32,
    pub review_status: ReviewStatus,
    pub sales: u32,
    pub timestamp: u64,
    pub paper_uri: String,
}

impl Space for Paper {
    const INIT_SPACE: usize =
        8 + // Anchor discriminator
        (200 + 4) + // URI/API Code (max 200 chars + prefix)
        4 + // version (u32)
        32 + // owner (Pubkey)
        1 + // listed (bool)
        8 + // price (u64)
        1 + // bump (u8)
        1 + // user_bump (u8)
        4 + // reviews (u32)
        ReviewStatus::INIT_SPACE + // review_status struct
        4 + // sales (u32)
        8 + // timestamp (u64)
        (200 + 4); //URI (max 200 chars + prefix)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ReviewStatus {
    pub approved: i64,
    pub rejected: i64,
    pub review_requested: i64,
}

impl anchor_lang::Space for ReviewStatus {
    const INIT_SPACE: usize = 8 * 3; // Three u32 fields (each 4 bytes)
}

impl ReviewStatus {
    pub fn update(&mut self, verdict: &Verdict) {
        match verdict {
            Verdict::Approved => {
                self.approved += 1;
            }
            Verdict::Rejected => {
                self.rejected += 1;
            }
            Verdict::ReviewRequested => {
                self.review_requested += 1;
            }
        }
    }

    pub fn rejection_ratio(&self) -> i64 {
        let total_reviews = self.rejected + self.approved + self.review_requested;

        if total_reviews == 0 {
            return 0; // Return 0 if there are no reviews
        }

        // Use floating-point division to handle the fraction or it will return 0 because it is an integer
        let ratio = (self.rejected as f64) / (total_reviews as f64);

        // Multiply by 100 to get percentage
        (ratio * 100.0) as i64
    }
}
