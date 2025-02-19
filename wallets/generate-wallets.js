const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

// Function to generate a keypair and save it as a JSON file
function generateAndSaveWallet(filename) {
  const keypair = Keypair.generate();
  const secretKey = Array.from(keypair.secretKey); // Convert Uint8Array to array
  fs.writeFileSync(filename, JSON.stringify(secretKey));
  console.log(`Generated and saved wallet to ${filename}`);
  console.log(`${filename} has the following public key: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

// Generate wallets for admin, bob, karen, bond, nancy, and roger
generateAndSaveWallet('admin-wallet.json');
generateAndSaveWallet('bob-wallet.json');
generateAndSaveWallet('karen-wallet.json');
generateAndSaveWallet('bond-wallet.json');
generateAndSaveWallet('nancy-wallet.json');
generateAndSaveWallet('roger-wallet.json');

console.log('All wallets generated and saved.');