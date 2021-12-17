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

describe('Token', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Blackjack;

  // console.log(program);
  // const baseAccount = anchor.web3.Keypair.generate();

  let mint = null;
  let from = null;
  let to = null;


  it('Inits!', async () => {
    mint = await createMint(provider);
    from = await createTokenAccount(provider, mint, provider.wallet.publicKey);
    to = await createTokenAccount(provider, mint, provider.wallet.publicKey);
  });

  it('Mints!', async () => {
    const tx = await program.rpc.proxyMintTo(new anchor.BN(1000), {
      accounts: {
        authority: provider.wallet.publicKey,
        mint,
        to: from,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    const fromAccount = await getTokenAccount(provider, from);

    assert.ok(fromAccount.amount.eq(new anchor.BN(1000)));
  });

  it('Transfers!', async () => {
    const tx = await program.rpc.proxyTransfer(new anchor.BN(400), {
      accounts: {
        authority: provider.wallet.publicKey,
        to,
        from,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    const fromAccount = await getTokenAccount(provider, from);
    const toAccount = await getTokenAccount(provider, to);

    assert.ok(fromAccount.amount.eq(new anchor.BN(600)));
    assert.ok(toAccount.amount.eq(new anchor.BN(400)));
  });

  it('Burns!', async () => {
    const tx = await program.rpc.proxyBurn(new anchor.BN(350), {
      accounts: {
        authority: provider.wallet.publicKey,
        mint,
        to,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    const toAccount = await getTokenAccount(provider, to);

    assert.ok(toAccount.amount.eq(new anchor.BN(50)));
  });

  it('Sets authority!', async () => {
    const newMinter = anchor.web3.Keypair.generate();
    const tx = await program.rpc.proxySetAuthority(
      { mintTokens: {} }, 
      newMinter.publicKey,
      {
      accounts: {
        accountOrMint: mint,
        currentAuthority: provider.wallet.publicKey,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      }
    });

    const mintInfo = await getMintInfo(provider, mint);

    assert.ok(mintInfo.mintAuthority.equals(newMinter.publicKey));
  });
});

