# 📄 PaperFI

PaperFI is a decentralized academic research marketplace built on Solana. It empowers researchers to publish, sell, and share their work without relying on traditional gatekeepers. The platform uses NFT technology to manage ownership, access, and reputation while preserving the integrity of peer review.

## 🔍 Overview

PaperFI allows authors to mint their research papers as NFTs and list them for sale, review, or public access. Reviewers are incentivized to provide high-quality feedback, and all transactions are secured on-chain using Solana smart contracts.

This project consists of two main components:
- 🧠 **Solana Program**: A smart contract (using Anchor) that handles the logic for publishing papers, submitting reviews, and minting badges.
- 🌐 **Frontend Interface** *(planned/under development)*: A user-facing DApp to interact with the program seamlessly.

## ✨ Features

- Decentralized publishing and access to research
- Mint research papers as NFTs with encrypted content
- Peer review system with incentives
- Badge NFT rewards for contributors (e.g. reviewers, publishers)
- Collection-verified NFTs for authenticity
- Governance-ready architecture


## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Anchor](https://book.anchor-lang.com/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli)
- [Yarn](https://yarnpkg.com/)

### Install Dependencies

```bash
yarn install

### Clone and Build

```bash
git clone https://github.com/Jars1987/PaperFI.git
cd PaperFI
anchor build

## 🛠 Tech Stack

- Solana – High-performance blockchain
- Anchor – Framework for Solana smart contracts
- Rust – For the on-chain program logic
- TypeScript – For tests and interaction scripts
- Metaplex – For NFT standards and metadata

## 🧪 Example Use Cases

🧑‍🔬 A researcher publishes a paper as an NFT with restricted access.
📖 Another user buys access, triggering royalties to the author.
🧑‍⚖️ A third party reviews the paper and earns a “Reviewer” NFT badge.

## 🗺 Roadmap

 Check - Paper publishing and NFT minting
 Check - Review system with incentives
 Check - Badge system
 Loading - Frontend DApp (React + Wallet Adapter)
 Loading - DAO-based governance layer

## 📜 License
This project is licensed under the MIT License

