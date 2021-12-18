const anchor = require('@project-serum/anchor');
const assert = require("assert");
const { SystemProgram } = anchor.web3;

const { 
  createMint, 
  createTokenAccount, 
  TokenInstructions,
  getTokenAccount,
  getMintInfo
} = require("../helpers/token");

describe('game', () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Blackjack;
  const baseAccount = anchor.web3.Keypair.generate();

  let mint = null;
  let tokenAccount = null;

  it("Inits", async () => {
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

    mint = await createMint(provider);
    tokenAccount = await createTokenAccount(provider, mint, provider.wallet.publicKey);
  });

  it("Sets token account", async () => {
    const tx = await program.rpc.setTokenAccount({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        tokenAccount: tokenAccount
      },
      // signers: [tokenAccount]
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

    // console.log(tokenAccount, account.playerAccounts[0].tokenAccount)
    assert.ok(account.playerAccounts[0].tokenAccount.toString() === tokenAccount.toString());
  });

  const table = anchor.web3.Keypair.generate();
  const player = anchor.web3.Keypair.generate();

  it("Bets!", async () => {
    await program.rpc.proxyMintTo(new anchor.BN(1000), {
      accounts: {
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    let account = await getTokenAccount(provider, tokenAccount);
    assert.ok(account.amount.eq(new anchor.BN(1000)));

    await program.rpc.newTable({
      accounts: {
        table: table.publicKey,
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [table]
    });

    await program.rpc.newPlayer({
      accounts: {
        player: player.publicKey,
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [player]
    });

    await program.rpc.connectToTable({
      accounts: {
        table: table.publicKey,
        player: player.publicKey,
      },
    });

    await program.rpc.makeBet(new anchor.BN(100), {
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    account = await getTokenAccount(provider, tokenAccount);
    assert.ok(account.amount.eq(new anchor.BN(900)));
  });

  it("Deals!", async () => {
    await program.rpc.getHand({
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    });

    let account1 = await program.account.table.fetch(table.publicKey);
    // console.log(account1.playerAccounts[0].key, account1.playerAccounts[0].value);
    assert.ok(account1.deck.cards.length === 48);

    let account2 = await program.account.player.fetch(player.publicKey);
    console.log(account2.hand);
    assert.ok(account2.hand.cards.length === 2);
  });

  it("Hits!", async () => {
    await program.rpc.hit({
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
      },
    });

    let account1 = await program.account.table.fetch(table.publicKey);
    // console.log(account1.playerAccounts[0].key, account1.playerAccounts[0].value);
    // assert.ok(account1.deck.cards.length === 52);

    let account2 = await program.account.player.fetch(player.publicKey);
    console.log(account2.hand);
    assert.ok(account2.hand.cards.length === 3);
  });

  it("Stands!", async () => {
    await program.rpc.makeBet(new anchor.BN(100), {
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    await program.rpc.getHand({
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    });

    await program.rpc.stand({
      accounts: {
        player: player.publicKey,
        table: table.publicKey,
        authority: provider.wallet.publicKey,
        mint,
        to: tokenAccount,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    let account = await program.account.table.fetch(table.publicKey);
    // console.log(account1.playerAccounts[0].key, account1.playerAccounts[0].value);
    assert.ok(account.deck.cards.length === 52);
    account = await program.account.player.fetch(player.publicKey);
    console.log(account.hand);
    assert.ok(account.stake.toString() === "0");
    
    // account = await getTokenAccount(provider, tokenAccount);
    // assert.ok(account.amount.eq(new anchor.BN(900)));
  });
});