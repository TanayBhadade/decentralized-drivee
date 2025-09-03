'use client';
import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import FileManagerABI from '../contracts/FileManager.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  const initializeContract = async (provider) => {
    try {
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, FileManagerABI.abi, signer);
      setContract(contractInstance);
    } catch (error) {
      console.error('Error initializing contract:', error);
    }
  };

  const checkIfWalletIsConnected = async () => {
    if (!isMetaMaskInstalled) {
      console.log("MetaMask is not installed.");
      setIsInitialized(true);
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const provider = new BrowserProvider(window.ethereum);
        await initializeContract(provider);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const switchToLocalNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7A69' }], // 31337 in hex (Hardhat default)
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7A69',
              chainName: 'Hardhat Local',
              rpcUrls: ['http://localhost:8545'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }]
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      console.error("MetaMask is not installed. Please install MetaMask to use this app.");
      return;
    }
    try {
      setIsLoading(true);
      await switchToLocalNetwork();
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const provider = new BrowserProvider(window.ethereum);
      await initializeContract(provider);
      setIsLoading(false);
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      console.error("Failed to connect wallet. Please try again.");
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return { 
    account, 
    contract, 
    isLoading, 
    connectWallet, 
    disconnectWallet, 
    isMetaMaskInstalled,
    isInitialized 
  };
};

