const anchor = require('@project-serum/anchor');
const assert = require("assert");
const { SystemProgram } = anchor.web3;


describe('blackjack', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Blackjack;
  const baseAccount = anchor.web3.Keypair.generate();

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    // console.log("Your transaction signature", tx);

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    // console.log(program.account);
    assert.ok(account.numPlayerAcnts.toString() === "0");
  });

  const player1 = anchor.web3.Keypair.generate();

  it('Creates accounts!', async () => {
    const tx1 = await program.rpc.newPlayer({
      accounts: {
        player: player1.publicKey,
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [player1]
    });
    // console.log("Your transaction signature", tx1);

    let account1 = await program.account.baseAccount.fetch(baseAccount.publicKey);
    // console.log(account1.playerAccounts[0].key, account1.playerAccounts[0].value);
    assert.ok(account1.numPlayerAcnts.toString() === "1");

    let account2 = await program.account.player.fetch(player1.publicKey);
    // console.log(account2);
    assert.ok(account2.stake.toString() === "0");

    const player2 = anchor.web3.Keypair.generate();
    const tx2 = await program.rpc.newPlayer({
      accounts: {
        player: player2.publicKey,
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [player2]
    });
    // console.log("Your transaction signature", tx2);

    // console.log(program.account);

    account1 = await program.account.baseAccount.fetch(baseAccount.publicKey);
    // console.log(account1.playerAccounts[0].key, account1.playerAccounts[0].value);
    assert.ok(account1.numPlayerAcnts.toString() === "1");

    account2 = await program.account.player.fetch(player2.publicKey);
    // console.log(account2);
    assert.ok(account2.stake.toString() === "0");
  });

  const table = anchor.web3.Keypair.generate();
  it('Creates tables!', async () => {
    const tx1 = await program.rpc.newTable({
      accounts: {
        table: table.publicKey,
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [table]
    });

    // console.log("Your transaction signature", tx1);

    let account1 = await program.account.baseAccount.fetch(baseAccount.publicKey);
    // console.log(account1.tables[0]);
    assert.ok(account1.numTables.toString() === "1");

    let account2 = await program.account.table.fetch(table.publicKey);
    // console.log(account2);
    assert.ok(account2.deck.cards.length === 52);
  });

  it("Allows for players to connect to tables", async () => {
    await program.rpc.connectToTable({
      accounts: {
        table: table.publicKey,
        player: player1.publicKey,
      },
    });

    const account = await program.account.table.fetch(table.publicKey);
    assert.ok(account.numPlayers.toString() === "1");
  });

});
