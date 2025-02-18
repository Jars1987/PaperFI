

## Researcher


1. User Persona
Name: Jose Fernando Soares
Role: Researcher
Goal: Publish scientific papers, monetize and get academic recognition

2. User Story 

- As a researcher, I want to publish papers on a decentralized platform so that I can immediately make it available for the scientific community without waiting for a journal approval.
- As a researcher, I want to have the option to monetize the paper and therefore be able to list it for sale.
- As a researcher, I want to know if my paper was peer reviewed and the result.
- As a researcher,  I want recognition for my work.

3. Acceptance Criteria
Functionality: 
- The platform should allow researchers to input paper details (title, abstract, price, etc.) and upload the paper in a PDF format.
- The platform should create a user doc and a paper doc to track all the information. 
- The platform should encrypt the PDF url so no one has access to it without paying.
- The platform should create NFT Badges and allow the researchers to mint the NFTs when certain achievements are met.
Attributes: 
- The user doc should track the data regarding the user and his actions.
- The paper doc should track all the data regarding the paper submitted and all the interactions with the doc.
- The NFTs should have attributes referring to the achievement unlocked and are frozen in the user vault.
User Interaction: 
- Researchers should be able to create, update, list and delist their paper easily through the platform's UI.
- Researchers should be able to mint their badges.

4. Priority
High

5. Technical Notes 
Dependencies: 
- This story requires the creation of PDA accounts to store data, vaults to store SPL tokens/lamports and NFTs.
- This story requires NFT integration for the badges.
- This story requires a system to track user actions and paper doc interactions.
Considerations:
- Ensure metadata integrity and compatibility with querying mechanisms.
- Ensure compliance with data privacy regulations
- The platform needs a storage solution that is fast, safe and low cost to save the papers PDF.


## Buyer

1. User Persona
Name: Angela Bagio
Role: PhD Student
Goal: Purchase and access academic papers relevant to her field of interest.


2. User Story 
- As an individual buyer, I want to browse and purchase listed papers so that I can access academic research seamlessly.
- As a buyer I want to be able to query papers using dates, fields, key words and other filters.
- As a buyer I want to get access to the paper metrics.
- As a buyer I want to know if the case is already reviewed and who did the review. 

3. Acceptance Criteria
Functionality: 
- The platform should allow buyers to browse the papers and make purchases
Attributes: 
- The papers should display their metadata such as title, authors, abstract and revision. 
- The paper should display a button for buyers to be able to purchase it.
User Interaction: 
- Buyers should be able to search, filter, and purchase papers through an intuitive interface.

4. Priority
- High

5. Technical Notes 
Dependencies: 
- Search and filter features.
- Transaction management by anchor.
Considerations: 
- Ensure payment is secure
- Ensure the PDF url is decrypted after purchase

## Reviewer

1. User Persona
Name: Dr. John Doe
Role: Senior Researcher
Goal: Review papers, provide constructive feedback to improve research quality and to obtain acknowledgment from the scientific community.

2. User Story 

- As a peer reviewer, I want to submit reviews for papers so that I can help improve their credibility and earn recognition.
- As a peer reviewer, I want free access to the paper I am going to review as part of the work compensation.

3. Acceptance Criteria
Functionality: 
- The platform should allow for reviewers to download the paper.
- Reviewers should only be allowed to review one paper at a time.
- The platform should allow reviewers to submit the review.
- The platform should update the paper doc and create a review doc.
- The platform should create NFT Badges and allow the reviewers  to mint the NFTs when certain achievements are met.
Attributes: 
- Reviews should be tied to papers and publicly displayed once completed.
- The NFTs should have attributes referring to the achievement unlocked and are frozen in the user vault.
User Interaction: 
- Reviewers should be able to filter listed papers waiting for review. 
- Reviewers should be able to set notifications on, to receive alerts when a new paper of a given field or researcher  is listed for  review.
- Reviewers  should be able to mint their badges.

4. Priority
Medium

5. Technical Notes 
Dependencies: 
- This story requires a system to edit Paper Docs in anchor.
- This story requires a filter feature.
- This story requires a notification system.
- This story requires a Database to store reviews
Considerations: 
- Reviewers should not be able to abuse the free download. Possibly the best approach is to charge for the download and refund after the review is submitted.

## Admin

1. User Persona
Name: John McAfee
Role: Admin
Goal: Ensure smooth operation and to be able to withdraw funds.

2. User Story 
- As an Admin, I want to be able to check the platform metrics so that I can stay on top of the platform performance and security.
- As an Admin, I want to be able to withdraw funds from the vault.

3. Acceptance Criteria
Functionality: 
- The platform should allow operators to access user, paper and review docs.
- The platform should allow reviewing platform analytics.
- The platform should allow wallet management.
Attributes: 
- Dashboards with transaction logs and user activity. 
User Interaction:
- Admins  should be able to send funds to their personal wallet.
- Admnins should be able to access different types of analytics.

4. Priority
Low

5. Technical Notes 
Dependencies: 
- Data analysis tools and Admin panel
- Ticket Tool
- Transfering funds system in anchor
Considerations: 
- Ensure data security and comply with privacy regulations

### Prioritization Summary

MVP Features:
- Submit research paper (researcher)
- Browse and purchase papers (buyer)
- Secure storage and listing querying (researcher/reviewers)
Important Features
- Peer Review mechanism (reviewer)
- Fund Withdrawal (researcher and admin)
Future Iterations
- NFT badges for achievements (researcher/reviewers)
- Subscription and tiered access models (institutional users)

