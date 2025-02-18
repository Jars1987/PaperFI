import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { Paperfi } from '../target/types/paperfi';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { before, it } from 'mocha';
import {
  confirmTransaction,
  getLogs,
  makeKeypairs,
} from '@solana-developers/helpers';
import { randomBytes } from 'node:crypto';
import { assert, expect } from 'chai';
import {
  MPL_CORE_PROGRAM_ID,
  fetchAsset,
  fetchCollection,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { time } from 'node:console';

const programId = new PublicKey('D1n8FqQcWH85gHNShcMhv8wWQMunYLoq6PAz7NtCwgaR');
const mplCoreProgramId = new PublicKey(MPL_CORE_PROGRAM_ID);

describe('PaperFi', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.PaperFi as Program<Paperfi>;

  //Create admin keypair
  const admin = Keypair.generate();
  //Create User (publisher) keypair
  const bob = Keypair.generate();
  //Create User (bad reviewer) keypair
  const karen = Keypair.generate();
  //Create User(good reviwer) Keypair
  const bond = Keypair.generate();
  //Create User(Reject reviwer) Keypair
  const nancy = Keypair.generate();
  //create User (author) keypair
  const roger = Keypair.generate();

  //make collection keyair
  const badgeCollection = Keypair.generate();
  //make collection keyair for failed tx
  const badgeCollection2 = Keypair.generate();
  //make nft badge keypair
  const badgeNFT = Keypair.generate();

  //create a random id for the paper
  const id = new BN(randomBytes(8));
  const id2 = new BN(randomBytes(8));

  const umi = createUmi('http://127.0.0.1:8899').use(mplCore());

  before('Preparing enviorement for testing:', async () => {
    console.log('--------- Airdroping Lamports ----------');

    //airdrop  Admin
    let tx1 = await provider.connection.requestAirdrop(
      admin.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx1, 'confirmed');

    //airdrop Bob
    let tx2 = await provider.connection.requestAirdrop(
      bob.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx2, 'confirmed');

    //airdrop Karen
    let tx3 = await provider.connection.requestAirdrop(
      karen.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx3, 'confirmed');

    //airdrop Bond
    let tx4 = await provider.connection.requestAirdrop(
      bond.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx4, 'confirmed');

    //airdrop Nancy
    let tx5 = await provider.connection.requestAirdrop(
      nancy.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx5, 'confirmed');

    //airdrop roger
    let tx6 = await provider.connection.requestAirdrop(
      roger.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await confirmTransaction(connection, tx6, 'confirmed');
  });

  //------------------- Initialize PaperFi tests --------------------
  it('Initialize PaperFi and admin account', async () => {
    console.log('------- Initializing Paperfi ------------');
    try {
      const initilializeIx = await program.methods
        .initialize()
        .accountsPartial({
          admin: admin.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: admin.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [admin]
      );
    } catch {
      assert.fail('Failed to initialize PaperFi');
    }

    //Check if accounts was initialized properly
    //derive the config PDA address
    const [configAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    // Fetch the current config account
    const configAccount = await program.account.paperFiConfig.fetch(
      configAccountAdress
    );

    // Convert admin.publicKey and configAccount.admins to strings for comparison
    const adminPublicKeyString = admin.publicKey.toString();
    const adminPublicKeysInConfig = configAccount.admins.map(admin =>
      admin.toString()
    );

    // Check if the admin's public key is in the config admins list
    assert.isTrue(adminPublicKeysInConfig.includes(adminPublicKeyString));
  });

  it('Attempt to re-Initialize PaperFi and admin account', async () => {
    try {
      const initilializeIx = await program.methods
        .initialize()
        .accountsPartial({
          admin: admin.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: admin.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [admin]
      );

      assert.fail(
        'Something went wrong. Program re-initialized and admin account re-added'
      );
    } catch (e: any) {
      assert.isOk(
        'Test passed: Unable to initialize andmin and config again.'
      );
    }
  });

  //------------------- Initialize User tests --------------------
  it('Bob Signing up test', async () => {
    console.log('------- User Signing up ------------');

    let name = 'Bob';
    let title = 'PhD';
    try {
      // Find the PDA for the user account
      const [userAccountAddress, userBump] =
        await PublicKey.findProgramAddressSync(
          [Buffer.from('user'), bob.publicKey.toBuffer()],
          program.programId
        );

      // Find the PDA for the user vault account
      const [userVaultAddress, userVaultBump] =
        await PublicKey.findProgramAddressSync(
          [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
          program.programId
        );

      // Create the instruction with all required accounts
      const initilializeIx = await program.methods
        .signup(name, title)
        .accountsPartial({
          signer: bob.publicKey, // The wallet signing the transaction
          user: userAccountAddress, // PDA for the user account
          userVault: userVaultAddress, // PDA for the user vault account
          systemProgram: anchor.web3.SystemProgram.programId, // System program
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Bob');
    }

    //Test if user_account exist

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.name, name);
    assert.equal(userAccount.title, title);
    assert.equal(userAccount.owner.toString(), bob.publicKey.toString());
  });

  it('Attempt to re-signup Bob user_account', async () => {
    let name = 'Bob';
    let title = 'PhD';
    try {
      // Find the PDA for the user account
      const [userAccountAddress, userBump] =
        await PublicKey.findProgramAddressSync(
          [Buffer.from('user'), bob.publicKey.toBuffer()],
          program.programId
        );

      // Find the PDA for the user vault account
      const [userVaultAddress, userVaultBump] =
        await PublicKey.findProgramAddressSync(
          [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
          program.programId
        );

      // Create the instruction with all required accounts
      const initilializeIx = await program.methods
        .signup(name, title)
        .accountsPartial({
          signer: bob.publicKey, // The wallet signing the transaction
          user: userAccountAddress, // PDA for the user account
          userVault: userVaultAddress, // PDA for the user vault account
          systemProgram: anchor.web3.SystemProgram.programId, // System program
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );

      assert.fail('Test Failed as Bob was able signup again');
    } catch (e: any) {
      assert.isOk('Test passed: Bob was not able to re-signup ');
    }
  });
  it('Attempt to signup Karen with invalid paraments', async () => {
    //try to signup witha name larget then the maximum characters allowed
    let name =
      "Karen is a very bad reviewer. She is lonely and don/'t stop talking. Is this character enough?";
    let title = 'Technical Fudder Assistant';
    try {
      const initilializeIx = await program.methods
        .signup(name, title)
        .accounts({
          signer: karen.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [karen]
      );

      assert.fail(
        'Test Failed as Karen was able to signup with name with more than 64 characters'
      );
    } catch (e: any) {
      console.log(e.message);
      assert.isOk(
        'Test Passed: Karen was not able to signup. Name is too long'
      );
    }
  });

  it('Karen Signing up test', async () => {
    let name = 'Karen Fudder';
    let title = 'Technical Fudder Assistant';
    try {
      const initilializeIx = await program.methods
        .signup(name, title)
        .accounts({
          signer: karen.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [karen]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Karen');
    }

    //Test if user_account exist

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), karen.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.name, name);
  });

  it('Nancy Signing up test', async () => {
    let name = 'Nancy Troll';
    let title = 'Paper Rejecter';
    try {
      const initilializeIx = await program.methods
        .signup(name, title)
        .accounts({
          signer: nancy.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: nancy.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [nancy]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Nancy');
    }

    //Test if user_account exist

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), nancy.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.name, name);
  });

  it('James Bond Signing up test', async () => {
    let name = 'James Bond';
    let title = 'Special Agent';
    try {
      const initilializeIx = await program.methods
        .signup(name, title)
        .accounts({
          signer: bond.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bond.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bond]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Bond');
    }

    //Test if user_account exist

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bond.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.name, name);
  });

  it('Roger Author Signing up test', async () => {
    let name = 'Roger Author';
    let title = 'Paper Maker';
    try {
      const initilializeIx = await program.methods
        .signup(name, title)
        .accounts({
          signer: roger.publicKey,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: roger.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [roger]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Bond');
    }

    //Test if user_account exist

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), roger.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.name, name);
  });

  //------------ Initialize Edit User Tests ------------------
  it('Bob Edits user_account test', async () => {
    console.log('------- User Editing Account --------------');

    const editUserParams = {
      name: null,
      title: 'Little Genius',
    };

    const [userAccountWallet, userAccountBump] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user'), bob.publicKey.toBuffer()],
        programId
      );

    try {
      const initilializeIx = await program.methods
        .editUser(editUserParams)
        .accountsPartial({
          owner: bob.publicKey,
          user: userAccountWallet,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to edit Bob user_account');
    }

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountWallet
    );

    assert.equal(userAccount.title, editUserParams.title);
  });

  it('Bob Edits user_account with incorrect parameters test', async () => {
    const editUserParams = {
      name: 'Bob the name that was too long to right in this the program',
      title: '',
    };

    const userAccountWallet = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .editUser(editUserParams)
        .accountsPartial({
          owner: bob.publicKey,
          user: userAccountWallet[0],
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );

      assert.fail(
        'Test Failed: Bob was able to edit user account with invalid parameters.'
      );
    } catch (e: any) {
      assert.isOk(
        e.message,
        'Test Passed: Bob was not able to edit user account with invalid parameters.'
      );
    }
  });

  //------------ Initialize Create Paper Tests ------------------
  it('Bob Creates Paper test', async () => {
    console.log('------- User Creating Paper --------------');

    let paper_info_url = 'www.arwee.yourinfo.com/paper';
    let price = new BN(1000000000);
    let uri = 'www.arwee.com/paper';

    const userAccountWallet = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [paperOwnerAdress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('author'),
        bob.publicKey.toBuffer(),
        paperAccountAdress.toBuffer(),
      ],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .newPaper(id, paper_info_url, price, uri)
        .accountsPartial({
          owner: bob.publicKey,
          userAccount: userAccountWallet[0],
          paper: paperAccountAdress,
          paperAuthor: paperOwnerAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Bob failed to publish a new paper');
    }

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountWallet[0]
    );

    //get the paper account
    const paperAccount = await program.account.paper.fetch(paperAccountAdress);

    //get the paper owner account
    const paperOwner = await program.account.paperAuthor.fetch(
      paperOwnerAdress
    );

    assert.equal(paperAccount.price.toString(), price.toString());
    assert.equal(paperAccount.owner.toString(), userAccount.owner.toString());
    assert.equal(paperOwner.paper.toString(), paperAccountAdress.toString());
    assert.equal(paperAccount.listed, true);
  });

  it('Bob Creates Paper with invalid parameters test', async () => {
    let paper_info_url = 'www.arwee.yourinfo😍.com/paper';
    let price = new BN(100000);
    let uri = 'www.arwee.com/paper';

    const [userAccountWallet, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [paperOwnerAdress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('author'),
        bob.publicKey.toBuffer(),
        paperAccountAdress.toBuffer(),
      ],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .newPaper(id2, paper_info_url, price, uri)
        .accountsPartial({
          owner: bob.publicKey,
          userAccount: userAccountWallet,
          paper: paperAccountAdress,
          paperAuthor: paperOwnerAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );

      assert.fail(
        'Test Failed: Bob was able to publish a new paper with invalid parameters.'
      );
    } catch (e: any) {
      assert.isOk(
        e.message,
        'Test Passed: Bob was not able to publish a new paper with invalid parameters.'
      );
    }
  });

  //------------ Initialize Edit Paper Tests ------------------

  it('Bob Edits Paper test', async () => {
    const editPaperParams = {
      paperInfoUrl: null,
      listed: null,
      price: new BN(500000000),
      version: null,
      paperUri: null,
    };

    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .editPaper(id, editPaperParams)
        .accountsPartial({
          owner: bob.publicKey,
          paper: paperAccountAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Bob failed to publish a new paper');
    }
    //get the paper account
    const paperAccount = await program.account.paper.fetch(paperAccountAdress);

    assert.equal(
      paperAccount.price.toString(),
      editPaperParams.price.toString()
    );
  });

  it('Bob Edits Paper with invalid parameters test', async () => {
    const editPaperParams = {
      paperInfoUrl: null,
      listed: null,
      price: new BN(500),
      version: null,
      paperUri: null,
    };

    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .editPaper(id, editPaperParams)
        .accountsPartial({
          owner: bob.publicKey,
          paper: paperAccountAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );

      assert.fail('Bob was able to edit paper with invalid parameters');
    } catch (e: any) {
      assert.isOk("Bob wasn't able to edit paper with invalid parameters");
    }
  });

  it('Bob add Roger as new author', async () => {
    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [paperAuthorAdress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('author'),
        roger.publicKey.toBuffer(),
        paperAccountAdress.toBuffer(),
      ],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .newAuthor(roger.publicKey, id)
        .accountsPartial({
          owner: bob.publicKey,
          paper: paperAccountAdress,
          paperAuthor: paperAuthorAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Bob failed to add a new author');
    }

    //get the paper_author account
    //get the paper account
    const authAccount = await program.account.paperAuthor.fetch(
      paperAuthorAdress
    );

    assert.equal(authAccount.author.toString(), roger.publicKey.toString());
  });
  it('Roger confirms the ownership', async () => {
    const [paperAccountAdress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [paperAuthorAdress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('author'),
        roger.publicKey.toBuffer(),
        paperAccountAdress.toBuffer(),
      ],
      programId
    );

    try {
      const initilializeIx = await program.methods
        .verify(id)
        .accountsPartial({
          author: roger.publicKey,
          paperAuthor: paperAuthorAdress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: roger.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(initilializeIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [roger]
      );
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Roger failed to confirm ownership');
    }

    //get the paper_author account
    const authAccount = await program.account.paperAuthor.fetch(
      paperAuthorAdress
    );

    assert.equal(authAccount.verify, true);
  });
  //------------ Initialize Review Paper Tests ------------------
  it('Karen Reviews Paper with invalid parameters test', async () => {
    const verdict = { approved: {} }; // This is an example of using the `Verdict.Approved`
    const uri = 'http://example.com/review';

    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [reviewerAccountAddress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), karen.publicKey.toBuffer()],
      programId
    );

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        karen.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    // Generate the PDA for Karen's purchase (this shouldn't exist because she hasn't purchased the paper)
    const [purchasePdaAddress, _purchaseBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    // Generate the PDA for Karen's purchase (this shouldn't exist because she isn't the author)
    const [authorPdaAddress, _authorBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const reviewIx = await program.methods
        .reviewPaper(id, verdict, uri)
        .accountsPartial({
          signer: karen.publicKey,
          reviewerUserAccount: reviewerAccountAddress,
          userAccount: userAccountAddress,
          paper: paperAccountAddress,
          authorPda: authorPdaAddress, // You can leave the author pda undefined if needed
          paperOwned: purchasePdaAddress, // Pass the purchase PDA (Karen hasn't purchased, so it should fail)
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [karen]);

      // If this line is reached, then the test failed
      assert.fail('Karen was able to review paper without purchasing it');
    } catch (e: any) {
      // If the error occurs, it means the review failed as expected
      assert.isOk(
        "Karen wasn't able to review the paper without purchasing it"
      );
    }
  });

  it('Bond buys the Paper', async () => {
    //buyer user account
    const [buyerAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bond.publicKey.toBuffer()],
      programId
    );

    //paper owmer account
    const [paperOwnerAccountAddress, _] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user'), bob.publicKey.toBuffer()],
        programId
      );

    //paper owner vault
    const [userAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
      programId
    );

    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    //paper account
    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    //paper owner account
    const [purchaseAccountAddress, bump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          bond.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    //paper author account
    const [authorAccountAddress, abump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          bond.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const buyIx = await program.methods
        .buyPaper(id)
        .accountsPartial({
          buyer: bond.publicKey,
          buyerUserAccount: buyerAccountAddress,
          userAccount: paperOwnerAccountAddress,
          userVault: userAccountAddress,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          paper: paperAccountAddress,
          paperOwned: purchaseAccountAddress,
          authorPda: authorAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bond.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(buyIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [bond]);
    } catch (e: any) {
      console.error('Error:', e);
      if (e.logs) {
        console.error('Logs:', e.logs);
        assert.fail('Failed to buy the paper');
      }
    }

    //get the paper_owned account

    const paperOwned = await program.account.paperOwned.fetch(
      purchaseAccountAddress
    );

    assert.equal(paperOwned.paper.toString(), paperAccountAddress.toString());
    assert.equal(paperOwned.buyer.toString(), bond.publicKey.toString());
  });

  it('Bond Reviews Paper as approved', async () => {
    const verdict = { approved: {} }; // This is an example of using the `Verdict.Approved`
    const uri = 'http://example.com/review';

    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [reviewerAccountAddress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bond.publicKey.toBuffer()],
      programId
    );

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        bond.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    const [purchasePdaAddress, _purchaseBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          bond.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    const [authorPdaAddress, _authorBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          bond.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const reviewIx = await program.methods
        .reviewPaper(id, verdict, uri)
        .accountsPartial({
          signer: bond.publicKey,
          reviewerUserAccount: reviewerAccountAddress,
          userAccount: userAccountAddress,
          authorPda: authorPdaAddress,
          paperOwned: purchasePdaAddress,
          paper: paperAccountAddress,
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bond.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [bond]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Bond failed to review the paper');
    }

    //get the review account
    const reviewAccount = await program.account.review.fetch(
      reviewAccountAddress
    );

    assert.equal(reviewAccount.owner.toString(), bond.publicKey.toString());
  });
  it('Karen buys the Paper', async () => {
    //buyer user account
    const [buyerAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), karen.publicKey.toBuffer()],
      programId
    );

    //paper owmer account
    const [paperOwnerAccountAddress, _] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user'), bob.publicKey.toBuffer()],
        programId
      );

    //paper owner vault
    const [userAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
      programId
    );

    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    //paper account
    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    //paper owner account
    const [purchaseAccountAddress, bump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    //paper Author account
    const [authorAccountAddress, abump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const buyIx = await program.methods
        .buyPaper(id)
        .accountsPartial({
          buyer: karen.publicKey,
          buyerUserAccount: buyerAccountAddress,
          userAccount: paperOwnerAccountAddress,
          userVault: userAccountAddress,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          paper: paperAccountAddress,
          paperOwned: purchaseAccountAddress,
          authorPda: authorAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(buyIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [karen]);
    } catch (e: any) {
      console.error('Error:', e);
      if (e.logs) {
        console.error('Logs:', e.logs);
        assert.fail('Karen Failed to buy the paper');
      }
    }

    //get the paper_owned account

    const paperOwned = await program.account.paperOwned.fetch(
      purchaseAccountAddress
    );

    assert.equal(paperOwned.paper.toString(), paperAccountAddress.toString());
  });
  it('Karen Reviews Paper as request for review', async () => {
    const verdict = { reviewRequested: {} }; // This is an example of using the `Verdict.ReviewRequested`
    const uri = 'http://example.com/review';

    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [reviewerAccountAddress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), karen.publicKey.toBuffer()],
      programId
    );

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        karen.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    const [purchasePdaAddress, _purchaseBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    const [authorPdaAddress, _authorBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          karen.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const reviewIx = await program.methods
        .reviewPaper(id, verdict, uri)
        .accountsPartial({
          signer: karen.publicKey,
          reviewerUserAccount: reviewerAccountAddress,
          userAccount: userAccountAddress,
          authorPda: authorPdaAddress,
          paperOwned: purchasePdaAddress,
          paper: paperAccountAddress,
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [karen]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Karen failed to review the paper');
    }

    //get the review account
    const reviewAccount = await program.account.review.fetch(
      reviewAccountAddress
    );

    assert.equal(reviewAccount.owner.toString(), karen.publicKey.toString());
  });
  it('Karen Edit Review as approved', async () => {
    const verdict = { approved: {} };

    //paper
    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    //review
    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        karen.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    try {
      const reviewIx = await program.methods
        .editReview(id, verdict)
        .accountsPartial({
          signer: karen.publicKey,
          paper: paperAccountAddress,
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: karen.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [karen]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Karen failed to review the paper');
    }

    //get the review account
    const reviewAccount = await program.account.review.fetch(
      reviewAccountAddress
    );

    assert.deepEqual(reviewAccount.verdict, verdict);
  });

  it('Roger buys the paper he owns', async () => {
    //buyer user account
    const [buyerAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), roger.publicKey.toBuffer()],
      programId
    );

    //paper owmer account
    const [paperOwnerAccountAddress, _] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user'), bob.publicKey.toBuffer()],
        programId
      );

    //paper owner vault
    const [userAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
      programId
    );

    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    //paper account
    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    //paper owner account
    const [purchaseAccountAddress, bump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          roger.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    //paper author account
    const [authorAccountAddress, abump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          roger.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const buyIx = await program.methods
        .buyPaper(id)
        .accountsPartial({
          buyer: roger.publicKey,
          buyerUserAccount: buyerAccountAddress,
          userAccount: paperOwnerAccountAddress,
          userVault: userAccountAddress,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          paper: paperAccountAddress,
          paperOwned: purchaseAccountAddress,
          authorPda: authorAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: roger.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(buyIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [roger]);
    } catch (e: any) {
      console.error('Error:', e);
      if (e.logs) {
        console.error('Logs:', e.logs);
        assert.fail('Roger Failed to buy the paper');
      }
    }

    //get the paper_owned account

    const paperOwned = await program.account.paperOwned.fetch(
      purchaseAccountAddress
    );

    assert.equal(paperOwned.paper.toString(), paperAccountAddress.toString());
  });
  it('Roger attempts to review a paper that he owns', async () => {
    const verdict = { approved: {} }; // This is an example of using the `Verdict.Approved`
    const uri = 'http://example.com/review';

    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [reviewerAccountAddress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), roger.publicKey.toBuffer()],
      programId
    );

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        roger.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    const [purchasePdaAddress, _purchaseBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          roger.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    const [authorPdaAddress, _authorBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          roger.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const reviewIx = await program.methods
        .reviewPaper(id, verdict, uri)
        .accountsPartial({
          signer: roger.publicKey,
          reviewerUserAccount: reviewerAccountAddress,
          userAccount: userAccountAddress,
          authorPda: authorPdaAddress,
          paperOwned: purchasePdaAddress,
          paper: paperAccountAddress,
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: roger.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [roger]);

      assert.fail(
        'Test fail Roger is an author and he shouldnt be able to review his own the paper'
      );
    } catch (e) {
      assert.isOk('Test Passed: Roger failed to review is own paper');
    }
  });

  it('Nancy buys the paper', async () => {
    //buyer user account
    const [buyerAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), nancy.publicKey.toBuffer()],
      programId
    );

    //paper owmer account
    const [paperOwnerAccountAddress, _] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user'), bob.publicKey.toBuffer()],
        programId
      );

    //paper owner vault
    const [userAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
      programId
    );

    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    //paper account
    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    //paper owner account
    const [purchaseAccountAddress, bump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          nancy.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    //paper author account
    const [authorAccountAddress, abump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          nancy.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );
    try {
      const buyIx = await program.methods
        .buyPaper(id)
        .accountsPartial({
          buyer: nancy.publicKey,
          buyerUserAccount: buyerAccountAddress,
          userAccount: paperOwnerAccountAddress,
          userVault: userAccountAddress,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          paper: paperAccountAddress,
          paperOwned: purchaseAccountAddress,
          authorPda: authorAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: nancy.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(buyIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [nancy]);
    } catch (e: any) {
      console.error('Error:', e);
      if (e.logs) {
        console.error('Logs:', e.logs);
        assert.fail('Nancy Failed to buy the paper');
      }
    }

    //get the paper_owned account

    const paperOwned = await program.account.paperOwned.fetch(
      purchaseAccountAddress
    );

    assert.equal(paperOwned.paper.toString(), paperAccountAddress.toString());
  });

  it('Nancy Reviews paper as rejected', async () => {
    const verdict = { rejected: {} }; // This is an example of using the `Verdict.rejected`
    const uri = 'http://example.com/review';

    const [paperAccountAddress, _bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paper'), bob.publicKey.toBuffer(), id.toBuffer('le', 8)],
      programId
    );

    const [reviewerAccountAddress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), nancy.publicKey.toBuffer()],
      programId
    );

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    const [reviewAccountAddress, _bu] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('review'),
        nancy.publicKey.toBuffer(),
        paperAccountAddress.toBuffer(),
      ],
      programId
    );

    const [purchasePdaAddress, _purchaseBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('purchase'),
          nancy.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    const [authorPdaAddress, _authorBump] =
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from('author'),
          nancy.publicKey.toBuffer(),
          paperAccountAddress.toBuffer(),
        ],
        programId
      );

    try {
      const reviewIx = await program.methods
        .reviewPaper(id, verdict, uri)
        .accountsPartial({
          signer: nancy.publicKey,
          reviewerUserAccount: reviewerAccountAddress,
          userAccount: userAccountAddress,
          authorPda: authorPdaAddress,
          paperOwned: purchasePdaAddress,
          paper: paperAccountAddress,
          review: reviewAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: nancy.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      await anchor.web3.sendAndConfirmTransaction(connection, tx, [nancy]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Nancy failed to review the paper');
    }
    //get the review account
    const reviewAccount = await program.account.review.fetch(
      reviewAccountAddress
    );

    //get the paper account
    const paperAccount = await program.account.paper.fetch(paperAccountAddress);

    assert.equal(reviewAccount.owner.toString(), nancy.publicKey.toString());
    assert.equal(paperAccount.listed, false);
  });

  //------------ Initialize NFT Badges Test ------------------
  it('Admin Creates NFT Badge', async () => {
    const createBadgeParams = {
      name: 'Publisher',
      uri: 'https://arweave.net/Q_njzBo9OP491p8WVqwx-um0Q4Bbk1MO2BsnnQ2ClY8',
    };

    //Config account
    const [configAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    try {
      const reviewIx = await program.methods
        .makeBadge(createBadgeParams)
        .accountsPartial({
          admin: admin.publicKey,
          badge: badgeCollection.publicKey,
          config: configAccountAdress,
          mplCoreProgram: mplCoreProgramId,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: admin.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      const sig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [admin, badgeCollection],
        {
          skipPreflight: true,
          commitment: 'finalized',
        }
      );
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Admin failed to create the NFT Collection Badge');
    }

    //Solana SDK and metaplex uses different Publickeys types
    const collectionAsset = await fetchCollection(
      umi,
      badgeCollection.publicKey.toBase58()
    );

    // Perform assertions to verify the asset's properties
    expect(collectionAsset).to.exist;
    assert.equal(collectionAsset.name, 'Publisher');
    assert.equal(
      collectionAsset.uri,
      'https://arweave.net/Q_njzBo9OP491p8WVqwx-um0Q4Bbk1MO2BsnnQ2ClY8'
    );
  });
  it('User attempts to Creates NFT Badge (not admin)', async () => {
    const createBadgeParams = {
      name: 'Publisher',
      uri: 'https://arweave.net/Q_njzBo9OP491p8WVqwx-um0Q4Bbk1MO2BsnnQ2ClY8',
    };

    //Config account
    const [configAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    try {
      const reviewIx = await program.methods
        .makeBadge(createBadgeParams)
        .accountsPartial({
          admin: bob.publicKey,
          badge: badgeCollection2.publicKey,
          config: configAccountAdress,
          mplCoreProgram: mplCoreProgramId,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      const sig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob, badgeCollection2],
        {
          skipPreflight: true,
          commitment: 'finalized',
        }
      );

      assert.fail('user should have failed to create the NFT Collection Badge');
    } catch (e) {
      assert.isOk('User failed to create the NFT Collection Badge as expected');
    }
  });
  it('Bob Mints NFT Badge', async () => {
    const printBadgeArgs = {
      name: 'papers',
      uri: 'https://arweave.net/Q_njzBo9OP491p8WVqwx-um0Q4Bbk1MO2BsnnQ2ClY8',
      achievement: 'First Timer',
      record: 1,
    };

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    //Config account
    const [configAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    try {
      const reviewIx = await program.methods
        .mintAchievementNft(printBadgeArgs)
        .accountsPartial({
          user: bob.publicKey,
          userAccount: userAccountAddress,
          config: configAccountAdress,
          collection: badgeCollection.publicKey,
          asset: badgeNFT.publicKey,
          mplCoreProgram: mplCoreProgramId,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      const sig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob, badgeNFT],
        {
          skipPreflight: true,
          commitment: 'finalized',
        }
      );
    } catch (e) {
      console.log(e.message);
      assert.fail('User was not able to print the NFT Badge');
    }

    //Solana SDK and metaplex uses different Publickeys types
    const asset = await fetchAsset(umi, badgeNFT.publicKey.toBase58());
    expect(asset).to.exist;
    assert.equal(asset.name, 'papers');
  });
  it('Bob Mints NFT Badge with invalid parameters', async () => {
    const printBadgeArgs = {
      name: 'papers',
      uri: 'https://arweave.net/Q_njzBo9OP491p8WVqwx-um0Q4Bbk1MO2BsnnQ2ClY8',
      achievement: 'First Timer',
      record: 10,
    };

    const [userAccountAddress, _b] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    //Config account
    const [configAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    try {
      const reviewIx = await program.methods
        .mintAchievementNft(printBadgeArgs)
        .accountsPartial({
          user: bob.publicKey,
          userAccount: userAccountAddress,
          config: configAccountAdress,
          collection: badgeCollection.publicKey,
          asset: badgeNFT.publicKey,
          mplCoreProgram: mplCoreProgramId,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(reviewIx);

      // Send the transaction, this should fail
      const sig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [bob, badgeNFT],
        {
          skipPreflight: true,
          commitment: 'finalized',
        }
      );

      assert.fail(
        'User was able to print the NFT Badge with invalid parameters'
      );
    } catch (e) {
      assert.isOk(
        "User wasn't able to print the NFT Badge with invalid parameters"
      );
    }
  });

  //------------ Initialize Withdraw Funds Test ------------------
  it('Bob Withdraws Funds', async () => {
    const [userVaultAddress, userVaultBump] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
        program.programId
      );

    const initialBalance = await connection.getBalance(bob.publicKey);

    const vaultBalance = await connection.getBalance(userVaultAddress);

    //Estimate transaction fees
    const blockhashContext = await connection.getLatestBlockhash();

    const withdrawIx = await program.methods
      .userWithdraw(userVaultBump)
      .accountsPartial({
        user: bob.publicKey,
        userVault: userVaultAddress,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const message = new anchor.web3.Transaction({
      feePayer: bob.publicKey,
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
    })
      .add(withdrawIx)
      .compileMessage();

    const feeCalculator = await connection.getFeeForMessage(message);
    const txFee = feeCalculator.value || 0; // If null, default to 0
    try {
      const withdrawIx = await program.methods
        .userWithdraw(userVaultBump)
        .accountsPartial({
          user: bob.publicKey,
          userVault: userVaultAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(withdrawIx);

      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
        bob,
      ]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Bob failed to withdraw funds');
    }

    const finalBalance = await connection.getBalance(bob.publicKey);
    const balanceDiff = finalBalance - initialBalance;
    const vaultBalanceAfter = await connection.getBalance(userVaultAddress);

    assert.equal(vaultBalanceAfter, 0);
    assert.equal(balanceDiff, vaultBalance - txFee);
  });

  it('Bob Withdraws Funds with invalid parameters', async () => {
    const [userVaultAddress, userVaultBump] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('user_vault'), bob.publicKey.toBuffer()],
        program.programId
      );

    try {
      const withdrawIx = await program.methods
        .userWithdraw(userVaultBump)
        .accountsPartial({
          user: bob.publicKey,
          userVault: userVaultAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: bob.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(withdrawIx);

      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
        bob,
      ]);

      assert.fail(
        'Bob was able to withdraw funds when the vault had 0 balance'
      );
    } catch (e) {
      assert.isOk(
        'Bob was not able to withdraw funds when the vault had 0 balance'
      );
    }
  });
  it('Admin Withdraws Funds', async () => {
    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    const initialBalance = await connection.getBalance(admin.publicKey);

    const vaultBalance = await connection.getBalance(configVaultAccountAddress);

    //Estimate transaction fees
    const blockhashContext = await connection.getLatestBlockhash();

    const withdrawIx = await program.methods
      .adminWithdraw()
      .accountsPartial({
        admin: admin.publicKey,
        config: configAccountAddress,
        configVault: configVaultAccountAddress,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const message = new anchor.web3.Transaction({
      feePayer: admin.publicKey,
      blockhash: blockhashContext.blockhash, // ✅ Use the blockhash
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight, // ✅ Ensure it's valid
    })
      .add(withdrawIx)
      .compileMessage();

    const feeCalculator = await connection.getFeeForMessage(message);
    const txFee = feeCalculator.value || 0;

    try {
      const withdrawIx = await program.methods
        .adminWithdraw()
        .accountsPartial({
          admin: admin.publicKey,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: admin.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(withdrawIx);

      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
        admin,
      ]);
    } catch (e) {
      console.log(e.message);
      console.log(e.logs);
      assert.fail('Admin failed to withdraw the funds');
    }

    const finalBalance = await connection.getBalance(admin.publicKey);
    const balanceDiff = finalBalance - initialBalance;
    const vaultBalanceAfter = await connection.getBalance(
      configVaultAccountAddress
    );

    assert.equal(vaultBalanceAfter, 0);
    assert.equal(balanceDiff, vaultBalance - txFee);
  });
  it('Admin Withdraws Funds with vault empty', async () => {
    //config account
    const [configAccountAddress, _b_] = await PublicKey.findProgramAddressSync(
      [Buffer.from('paperfi_config')],
      programId
    );

    //config vault
    const [configVaultAccountAddress, _bum] =
      await PublicKey.findProgramAddressSync(
        [Buffer.from('config_vault'), configAccountAddress.toBuffer()],
        programId
      );

    try {
      const withdrawIx = await program.methods
        .adminWithdraw()
        .accountsPartial({
          admin: admin.publicKey,
          config: configAccountAddress,
          configVault: configVaultAccountAddress,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const blockhashContext = await connection.getLatestBlockhash();

      const tx = new anchor.web3.Transaction({
        feePayer: admin.publicKey,
        blockhash: blockhashContext.blockhash,
        lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      }).add(withdrawIx);

      const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
        admin,
      ]);

      assert.fail('Admin was able to withdraw funds when the vault was empty');
    } catch (e) {
      assert.isOk(
        "Admin wasn't able to withdraw funds when the vault was empty"
      );
    }
  });
});
