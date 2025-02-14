import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { Paperfi } from '../target/types/paperfi';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { before, it } from 'mocha';
import { confirmTransaction, makeKeypairs } from '@solana-developers/helpers';
import { randomBytes } from 'node:crypto';
import { assert } from 'chai';

const programId = new PublicKey('7Ucfh3P9fP4Z3YUo1kmKVTKCyf6da9ppsSiEGFCTGrx6');

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

  //create a random id for the paper
  const id = new BN(randomBytes(8));

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

      console.log(`Signature: ${signature}`);

      assert.fail('Test Failed as Bob was able signup again');
    } catch (e: any) {
      assert.isOk(e.message, 'Test passed: Bob was not able to re-signup ');
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

      console.log(`Signature: ${signature}`);
      assert.fail(
        'Test Failed as Karen was able to signup with name with more than 64 characters'
      );
    } catch (e: any) {
      console.log(e.message);
      assert.isOk(
        e.message,
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

      console.log(`Signature: ${signature}`);
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

      console.log(`Signature: ${signature}`);
    } catch (e: any) {
      console.log(e.message);
      assert.fail('Failed to signup Karen');
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

  //------------ Initialize Edit User Tests ------------------
  it('Bob Edits user_account test', async () => {
    console.log('------- User Editing Account --------------');

    const editUserParams = {
      name: null,
      title: 'Little Genius',
    };

    try {
      const initilializeIx = await program.methods
        .editUser(editUserParams) //---- only works this way
        .accounts({
          owner: bob.publicKey,
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
      assert.fail('Failed to edit Bob user_account');
    }

    const [userAccountAdress, _] = await PublicKey.findProgramAddressSync(
      [Buffer.from('user'), bob.publicKey.toBuffer()],
      programId
    );

    //Get Bob user_account PDA and assert the name, title and owner
    const userAccount = await program.account.userAccount.fetch(
      userAccountAdress
    );

    assert.equal(userAccount.title, editUserParams.title);
  });
});
