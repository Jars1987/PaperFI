use anchor_lang::prelude::*;
use crate::helpers::Verdict;

#[account]
pub struct Review {
    pub owner: Pubkey,
    pub paper: Pubkey,
    pub verdict: Verdict,
    pub timestamp: u64,
    pub review_uri: String,
}

impl Space for Review {
    const INIT_SPACE: usize = 8 + 32 + 32 + Verdict::INIT_SPACE + 8 + 204;
}

/*
FO Note for future reference:

export enum Verdict {
  Approved = 0,
  Rejected = 1,
  ReviewRequested = 2,
}

//Getting info
  const reviewAccount = await program.account.review.fetch(reviewPda);
const verdict = reviewAccount.verdict as number; // Verdict is stored as a number

switch (verdict) {
  case Verdict.Approved:
    console.log("The paper was Approved!");
    break;
  case Verdict.Rejected:
    console.log("The paper was Rejected!");
    break;
  case Verdict.ReviewRequested:
    console.log("The paper needs more reviews.");
    break;
  default:
    console.log("Unknown verdict!");
}

    //sending info

    await program.methods
  .reviewPaper(Verdict.Rejected) // Use enum as input
  .accounts({
    reviewer: reviewerKey,
    user: userPda,
    paper: paperPda,
    review: reviewPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
*/
