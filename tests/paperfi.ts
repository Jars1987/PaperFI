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
import { confirmTransaction, makeKeypairs } from '@solana-developers/helpers';
import { randomBytes } from 'node:crypto';
import { assert } from 'chai';

const programId = new PublicKey('D1n8FqQcWH85gHNShcMhv8wWQMunYLoq6PAz7NtCwgaR');

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

  //create a random id for the paper
  const id = new BN(randomBytes(8));
  const id2 = new BN(randomBytes(8));

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
      2 * LAMPORTS_PER_SOL
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
        e.message,
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

      console.log(`Signature: ${signature}`);
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
  it('Roger confirms the ownership', async () => {});

  // PLEASE REVIEW REVIEW_PAPER INSTRUCTIONS REQURIEMENTS

  //------------ Initialize Review Paper Tests ------------------
  it('Karen Reviews Paper with invalid parameters test', async () => {});
  it('Bond buys the Paper', async () => {});
  it('Bond Reviews Paper as approved', async () => {});
  it('Karen buys the Paper', async () => {});
  it('Karen Reviews Paper as request for review', async () => {});
  it('Karen Edir Review as approved', async () => {});
  it('Nancy Reviews paper as rejected', async () => {});
  it('Roger attempts to review a paper that he owns', async () => {});

  //------------ Initialize NFT Badges Test ------------------
  it('Admin Creates NFT Badge', async () => {});
  it('Admin Creates NFT Badge with invalid parameters', async () => {});
  it('Bob Mints NFT Badge', async () => {});
  it('Bob Mints NFT Badge with invalid parameters', async () => {});
  //------------ Initialize Withdra Funds Test ------------------
  it('Bob Withdraws Funds', async () => {});
  it('Bob Withdraws Funds with invalid parameters', async () => {});
  it('Admin Withdraws Funds', async () => {});
  it('Admin Withdraws Funds with invalid parameters', async () => {});
});
