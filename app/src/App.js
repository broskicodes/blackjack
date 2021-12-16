// import logo from './logo.svg';
import React, { useState, useEffect } from "react";
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <div className="App">
      {!walletAddress && renderNotConnectedContainer()}
    </div>
  );
}

export default App;
