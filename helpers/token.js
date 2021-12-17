const serumCmn = require("@project-serum/common");
const anchor = require('@project-serum/anchor');

const TokenInstructions = require("@project-serum/serum").TokenInstructions;

  const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  TokenInstructions.TOKEN_PROGRAM_ID.toString()
);

const getTokenAccount = async (provider, addr) => {
  return await serumCmn.getTokenAccount(provider, addr);
}

const getMintInfo = async (provider, mintAddr) => {
  return await serumCmn.getMintInfo(provider, mintAddr);
}

const createMint = async (provider, authority) => {
  if (authority === undefined) {
    authority = provider.wallet.publicKey;
  }
  const mint = anchor.web3.Keypair.generate();
  const instructions = await createMintInstructions(
    provider,
    authority,
    mint.publicKey
  );

  const tx = new anchor.web3.Transaction();
  tx.add(...instructions);

  await provider.send(tx, [mint]);

  return mint.publicKey;
}

const createMintInstructions = async (provider, authority, mint) => {
  let instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint,
      decimals: 0,
      mintAuthority: authority,
    }),
  ];
  return instructions;
}

const createTokenAccount = async (provider, mint, owner) => {
  const vault = anchor.web3.Keypair.generate();
  const tx = new anchor.web3.Transaction();
  tx.add(
    ...(await createTokenAccountInstrs(provider, vault.publicKey, mint, owner))
  );
  await provider.send(tx, [vault]);
  return vault.publicKey;
}

const createTokenAccountInstrs = async (
  provider,
  newAccountPubkey,
  mint,
  owner,
  lamports
) => {
  if (lamports === undefined) {
    lamports = await provider.connection.getMinimumBalanceForRentExemption(165);
  }
  return [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey,
      space: 165,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: newAccountPubkey,
      mint,
      owner,
    }),
  ];
}

module.exports = {
  createMint,
  createTokenAccount,
  TokenInstructions,
  getTokenAccount,
  getMintInfo
}