const checkIfWalletIsConnected = async () => {
  try {
    setIsLoading(true);
    const { solana } = window;

    if (solana) {
      if (solana.isPhantom) {
        console.log('Phantom wallet found!');

        const response = await solana.connect({ onlyIfTrusted: true });
        console.log("Connected with pubkey:", response.publicKey.toString());
        setWalletAddress(response.publicKey);
      }
    } else {
      alert('Solana object not found! Get a Phantom Wallet 👻');
    }
    setIsLoading(false);
  } catch (error) {
    console.error(error);
    setIsLoading(false);
  }
};

const connectWallet = async () => {
  setIsLoading(true);
  const { solana } = window;

  if (solana) {
    const response = await solana.connect();
    console.log('Connected with Public Key:', response.publicKey.toString());
    setWalletAddress(response.publicKey);
  }
  setIsLoading(false);
};