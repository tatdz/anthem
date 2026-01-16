// components/WalletConnect.tsx
'use client'
import { useState, useEffect } from 'react'
import { Wallet, LogOut, Copy, Check } from 'lucide-react'
import { BrowserProvider } from 'ethers'

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkConnection()
    
    // Listen for account changes
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
    
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAddress(accounts[0])
    } else {
      setAddress(null)
    }
  }

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setAddress(accounts[0].address)
        }
      } catch (error) {
        console.error('Failed to check connection:', error)
      }
    }
  }

  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      setAddress(accounts[0])
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect wallet')
    }
  }

  const disconnect = () => {
    setAddress(null)
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!mounted) {
    return (
      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 animate-pulse">
        <div className="w-4 h-4 bg-gray-600 rounded"></div>
        <div className="w-16 h-4 bg-gray-600 rounded"></div>
      </button>
    )
  }

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={copyAddress}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span className="font-mono text-sm">{truncateAddress(address)}</span>
        </button>
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect Wallet</span>
    </button>
  )
}