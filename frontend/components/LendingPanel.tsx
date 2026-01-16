// components/LendingPanel.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { 
  Banknote, Shield, Zap, Loader2, AlertTriangle, Lock,
  RefreshCw, CheckCircle, XCircle, DollarSign, Info,
  Building2, Layers, Coins, ArrowDownUp
} from 'lucide-react'
import { Contract, BrowserProvider, formatUnits, parseUnits } from 'ethers'
import { CONTRACT_ADDRESSES, decodeCustomError } from "@/lib/contract-helpers"
import { 
  ANTHEM_LENDING_MODULE_ABI, 
  SOVEREIGN_POOL_ABI, 
  UI_MOCK_USDC_ABI,
  ERC20_ABI 
} from '@/lib/abis/index'

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
}

interface LendingStats {
  availableUSDC: string;
  totalCollateral: string;
  totalBorrowed: string;
  activeLoans: number;
  totalLoans: number;
}

interface UserTokens {
  usdc: string;
  senior: string;
  junior: string;
  lpTokens: string;
}

interface UserLoan {
  id: number;
  collateralToken: string;
  collateralAmount: string;
  loanAmount: string;
  interestRate: string;
  dueDate: string;
  active: boolean;
  currentInterest: string;
  totalToRepay: string;
}

export default function LendingPanel() {
  const [selectedCollateral, setSelectedCollateral] = useState<'senior' | 'junior'>('senior')
  const [collateralAmount, setCollateralAmount] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [creatingLoan, setCreatingLoan] = useState(false)
  const [withdrawingFromPool, setWithdrawingFromPool] = useState(false)
  const [userTokens, setUserTokens] = useState<UserTokens>({
    usdc: '0',
    senior: '0',
    junior: '0',
    lpTokens: '0'
  })
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [priorityScore, setPriorityScore] = useState<number>(25)
  const [currentLTV, setCurrentLTV] = useState<number>(60)
  const [adjustment, setAdjustment] = useState<number>(0)
  const [recommendation, setRecommendation] = useState<string>('')
  const [loadingLTV, setLoadingLTV] = useState(false)
  const [lendingStats, setLendingStats] = useState<LendingStats>({
    availableUSDC: '0',
    totalCollateral: '0',
    totalBorrowed: '0',
    activeLoans: 0,
    totalLoans: 0
  })
  const [userLoans, setUserLoans] = useState<UserLoan[]>([])

  // Debug log helper
  const debug = (label: string, data: any) => {
    console.log(`🔍 [${label}]`, data)
  }

  const getEthereum = useCallback((): EthereumProvider => {
    if (typeof window === 'undefined') {
      throw new Error('window is undefined')
    }
    
    const ethereum = (window as any).ethereum as EthereumProvider | undefined
    if (!ethereum) {
      throw new Error('MetaMask not detected')
    }
    
    return ethereum
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        debug('Initializing component', {})
        const ethereum = getEthereum()
        const ethersProvider = new BrowserProvider(ethereum as any)
        const accounts = await ethersProvider.listAccounts()
        if (accounts.length > 0) {
          debug('Found connected account', accounts[0].address)
          setAddress(accounts[0].address)
          setIsConnected(true)
          await fetchAllData(accounts[0].address, ethersProvider)
        }
      } catch (error: any) {
        if (!error.message?.includes('MetaMask not detected')) {
          debug('Initialization error', error)
        }
      }
    }
    
    init()
  }, [getEthereum])

  const fetchUserLoans = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      debug('Fetching user loans', { userAddress })
      const lendingContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        ANTHEM_LENDING_MODULE_ABI,
        ethersProvider
      )
      
      const loanIds = await lendingContract.getUserLoanIds(userAddress)
      debug('User loan IDs', loanIds)
      
      const loans: UserLoan[] = []
      
      for (let i = 0; i < loanIds.length; i++) {
        const loanId = Number(loanIds[i])
        debug('Fetching loan details', { loanId })
        
        try {
          const loanData = await lendingContract.getLoan(loanId)
          const interest = await lendingContract.calculateInterest(loanId)
          const totalRepay = loanData[3] + interest
          
          loans.push({
            id: loanId,
            collateralToken: loanData[1],
            collateralAmount: formatUnits(loanData[2], 6),
            loanAmount: formatUnits(loanData[3], 6),
            interestRate: "5.00",
            dueDate: new Date(Number(loanData[6]) * 1000).toLocaleDateString(),
            active: loanData[7],
            currentInterest: formatUnits(interest, 6),
            totalToRepay: formatUnits(totalRepay, 6)
          })
        } catch (loanError) {
          debug(`Error fetching loan ${loanId}`, loanError)
        }
      }
      
      setUserLoans(loans)
      debug('User loans loaded', loans)
      
    } catch (error) {
      debug('Failed to fetch user loans', error)
    }
  }

  const fetchAllData = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      debug('Fetching all data', { userAddress })
      await Promise.all([
        fetchUserTokens(userAddress, ethersProvider),
        fetchLendingModuleStats(ethersProvider),
        fetchPriorityScore(ethersProvider),
        fetchLTVInfo(ethersProvider),
        fetchUserLoans(userAddress, ethersProvider)
      ])
      debug('All data fetched successfully', {})
    } catch (error) {
      debug('Failed to fetch all data', error)
    }
  }

  const fetchUserTokens = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      debug('Fetching user tokens', { userAddress })
      
      const usdcContract = new Contract(
        CONTRACT_ADDRESSES.UI_MOCK_USDC,
        UI_MOCK_USDC_ABI,
        ethersProvider
      )
      
      const seniorContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_SENIOR,
        ERC20_ABI,
        ethersProvider
      )
      
      const juniorContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_JUNIOR,
        ERC20_ABI,
        ethersProvider
      )
      
      const poolContract = new Contract(
        CONTRACT_ADDRESSES.SOVEREIGN_POOL,
        ERC20_ABI,
        ethersProvider
      )
      
      const [usdcBal, seniorBal, juniorBal, lpTokens] = await Promise.all([
        usdcContract.balanceOf(userAddress),
        seniorContract.balanceOf(userAddress),
        juniorContract.balanceOf(userAddress),
        poolContract.balanceOf(userAddress)
      ])

      const usdcDecimals = await usdcContract.decimals()
      const seniorDecimals = await seniorContract.decimals()
      const juniorDecimals = await juniorContract.decimals()
      const poolDecimals = await poolContract.decimals()

      const tokens = {
        usdc: formatUnits(usdcBal, usdcDecimals),
        senior: formatUnits(seniorBal, seniorDecimals),
        junior: formatUnits(juniorBal, juniorDecimals),
        lpTokens: formatUnits(lpTokens, poolDecimals)
      }
      
      setUserTokens(tokens)
      debug('User tokens fetched', tokens)
      
    } catch (error) {
      debug('Failed to fetch user tokens', error)
    }
  }

  const fetchLendingModuleStats = async (ethersProvider: BrowserProvider) => {
    try {
      debug('Fetching lending stats', {})
      const lendingContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        ANTHEM_LENDING_MODULE_ABI,
        ethersProvider
      )
      
      const stats = await lendingContract.getProtocolStats()
      const statsData = {
        availableUSDC: formatUnits(stats[4], 6),
        totalCollateral: formatUnits(stats[2], 6),
        totalBorrowed: formatUnits(stats[3], 6),
        activeLoans: Number(stats[1]),
        totalLoans: Number(stats[0])
      }
      
      setLendingStats(statsData)
      debug('Lending stats fetched', statsData)
      
    } catch (error) {
      debug('Failed to fetch lending stats', error)
    }
  }

  const fetchPriorityScore = async (ethersProvider: BrowserProvider) => {
    try {
      debug('Fetching priority score', {})
      const oracleContract = new Contract(
        CONTRACT_ADDRESSES.COREWRITER_ORACLE,
        [
          {
            inputs: [],
            name: "priorityScore",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        ethersProvider
      )
      const score = await oracleContract.priorityScore()
      setPriorityScore(Number(score))
      debug('Priority score fetched', Number(score))
    } catch (error) {
      debug('Failed to get priority score', error)
      setPriorityScore(25)
    }
  }

  const fetchLTVInfo = async (ethersProvider: BrowserProvider) => {
    if (!isConnected) return
    
    setLoadingLTV(true)
    try {
      debug('Fetching LTV info', { selectedCollateral })
      const lendingContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        ANTHEM_LENDING_MODULE_ABI,
        ethersProvider
      )
      
      const collateralToken = selectedCollateral === 'senior' 
        ? CONTRACT_ADDRESSES.ANTHEM_SENIOR
        : CONTRACT_ADDRESSES.ANTHEM_JUNIOR
      
      const ltvInfo = await lendingContract.getRecommendedLTV(collateralToken)
      const baseLTV = Number(ltvInfo[0]) / 100
      const adjustedLTV = Number(ltvInfo[1]) / 100
      const adjustmentAmount = Number(ltvInfo[2]) / 100
      const recommendation = ltvInfo[3]
      
      setCurrentLTV(adjustedLTV)
      setAdjustment(adjustmentAmount)
      setRecommendation(recommendation)
      debug('LTV info fetched', { baseLTV, adjustedLTV, adjustmentAmount, recommendation })
      
    } catch (error) {
      debug('Failed to get LTV from contract', error)
      const baseLTV = selectedCollateral === 'senior' ? 60 : 40
      const adjustment = (priorityScore * 4000) / 10000 / 100
      const adjustedLTV = Math.max(baseLTV - adjustment, 20)
      
      setCurrentLTV(adjustedLTV)
      setAdjustment(adjustment)
      setRecommendation(priorityScore > 75 ? 'HIGH STRESS: LTV reduced' : 
                       priorityScore > 25 ? 'MODERATE: Standard LTV' : 
                       'CALM: Maximum LTV')
    } finally {
      setLoadingLTV(false)
    }
  }

  const connectWallet = async () => {
    try {
      debug('Connecting wallet', {})
      const ethereum = getEthereum()
      const ethersProvider = new BrowserProvider(ethereum as any)
      const accounts = await ethersProvider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        debug('Wallet connected', accounts[0])
        await fetchAllData(accounts[0], ethersProvider)
      }
    } catch (error: any) {
      debug('Failed to connect wallet', error)
      if (error.message?.includes('MetaMask not detected')) {
        alert('Please install MetaMask to connect your wallet')
      } else {
        alert('Failed to connect wallet. Please try again.')
      }
    }
  }

const calculateMaxLoan = useCallback(() => {
  if (!collateralAmount || collateralAmount.trim() === '') {
    return 0
  }
  const collateralNum = parseFloat(collateralAmount)
  if (isNaN(collateralNum) || collateralNum <= 0) {
    return 0
  }
  const maxLoanValue = collateralNum * (currentLTV / 100)
  const result = Math.floor(maxLoanValue * 100) / 100
  debug('calculateMaxLoan', { collateralAmount, currentLTV, result })
  return result
}, [collateralAmount, currentLTV])

  const updateLoanAmount = useCallback((collateral: string) => {
    const collateralNum = parseFloat(collateral) || 0
    const maxLoan = collateralNum * (currentLTV / 100)
    const safeLoan = maxLoan * 0.8
    const newLoanAmount = safeLoan.toFixed(2)
    setLoanAmount(newLoanAmount)
    debug('updateLoanAmount', { collateral, maxLoan, safeLoan, newLoanAmount })
  }, [currentLTV])

  const handleCreateLoan = async () => {
    debug('handleCreateLoan called', {
      isConnected, address, collateralAmount, loanAmount, selectedCollateral
    })

    if (!isConnected || !address) {
      alert('Connect wallet first')
      connectWallet()
      return
    }

    if (!collateralAmount || !loanAmount) {
      alert('Enter both collateral and loan amounts')
      return
    }

    const collateralNum = parseFloat(collateralAmount) || 0
    const loanNum = parseFloat(loanAmount) || 0
    
    if (collateralNum <= 0 || loanNum <= 0) {
      alert('Amounts must be greater than 0')
      return
    }

    // Check sANTHEM/jANTHEM balance
    const currentBalance = selectedCollateral === 'senior' 
      ? parseFloat(userTokens.senior) 
      : parseFloat(userTokens.junior)
    
    debug('Balance check', {
      collateralNum,
      currentBalance,
      tokenType: selectedCollateral,
      hasEnough: collateralNum <= currentBalance
    })
    
    if (collateralNum > currentBalance) {
      alert(`Insufficient ${selectedCollateral === 'senior' ? 'sANTHEM' : 'jANTHEM'} tokens. You have ${currentBalance} tokens`)
      return
    }

    const availableUSDC = parseFloat(lendingStats.availableUSDC)
    debug('USDC check', { loanNum, availableUSDC, hasEnough: loanNum <= availableUSDC })
    
    if (loanNum > availableUSDC) {
      alert(`Insufficient USDC in lending pool`)
      return
    }

    const maxLoan = calculateMaxLoan()
    debug('LTV check', { loanNum, maxLoan, withinLimit: loanNum <= maxLoan })
    
    if (loanNum > maxLoan) {
      alert(`Loan amount exceeds maximum LTV limit of ${maxLoan.toFixed(2)} USDC`)
      return
    }

    setCreatingLoan(true)
    debug('Starting loan creation process', {})
    
    try {
      const ethereum = getEthereum()
      const provider = new BrowserProvider(ethereum as any)
      const signer = await provider.getSigner()
      
      const collateralToken = selectedCollateral === 'senior' 
        ? CONTRACT_ADDRESSES.ANTHEM_SENIOR
        : CONTRACT_ADDRESSES.ANTHEM_JUNIOR
      
      const collateralAmountBN = parseUnits(collateralAmount, 6)
      const loanAmountBN = parseUnits(loanAmount, 6)

      debug('Contract parameters', {
        collateralToken,
        collateralAmount: collateralAmountBN.toString(),
        loanAmount: loanAmountBN.toString()
      })

      const lendingContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        ANTHEM_LENDING_MODULE_ABI,
        signer
      )
      
      // Approve tokens
      const tokenContract = new Contract(
        collateralToken,
        ERC20_ABI,
        signer
      )
      
      debug('Checking current allowance', {})
      const currentAllowance = await tokenContract.allowance(address, CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE)
      debug('Current allowance', formatUnits(currentAllowance, 6))
      
if (currentAllowance < collateralAmountBN) {
  debug('Approving tokens', { amount: collateralAmountBN.toString() })
  const approveTx = await tokenContract.approve(
    CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
    collateralAmountBN,
    { gasLimit: 100000n, gasPrice: 25000000n }
  )
  debug('Approval tx sent', { hash: approveTx.hash })
  await approveTx.wait()
  debug('Token approval confirmed', {}) // ✅ Fixed: added second argument
  await new Promise(resolve => setTimeout(resolve, 2000))
} else {
  debug('Sufficient allowance already exists', {})
}

      debug('Creating loan', {
        contract: CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        collateralToken,
        collateralAmount: collateralAmountBN.toString(),
        loanAmount: loanAmountBN.toString()
      })

      const createLoanTx = await lendingContract.createLoan(
        collateralToken,
        collateralAmountBN,
        loanAmountBN,
        { 
          gasLimit: 500000n,
          gasPrice: 25000000n
        }
      )
      
      debug('Create loan tx sent', createLoanTx.hash)
      const receipt = await createLoanTx.wait()
      debug('Transaction receipt', receipt)
      
      if (receipt && receipt.status === 1) {
        alert(`✅ Loan created successfully! Transaction: ${createLoanTx.hash}`)
        setCollateralAmount('')
        setLoanAmount('')
        await fetchAllData(address, provider)
      } else {
        throw new Error('Transaction failed')
      }
      
    } catch (error: any) {
      debug('Loan creation failed', error)
      console.error('Full error details:', error)
      
      let errorMsg = 'Transaction failed'
      
      if (error.data) {
        const decoded = decodeCustomError(error.data)
        errorMsg = `Contract error: ${decoded}`
        debug('Decoded error', decoded)
      } else if (error.message?.includes('Internal JSON-RPC error')) {
        const match = error.message.match(/Internal JSON-RPC error\.({.*})/)
        if (match) {
          try {
            const rpcError = JSON.parse(match[1])
            errorMsg = `RPC Error: ${rpcError.message || rpcError.code}`
            debug('RPC error details', rpcError)
          } catch (e) {
            errorMsg = 'MetaMask error. Try with smaller amount.'
          }
        } else {
          errorMsg = error.message
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      alert(`❌ Loan creation failed: ${errorMsg}`)
      
    } finally {
      setCreatingLoan(false)
    }
  }

  const handleWithdrawFromPool = async () => {
    if (!isConnected || !address) return
    
    setWithdrawingFromPool(true)
    
    try {
      debug('Withdrawing from pool', {})
      const ethereum = getEthereum()
      const provider = new BrowserProvider(ethereum as any)
      const signer = await provider.getSigner()
      
      const poolContract = new Contract(
        CONTRACT_ADDRESSES.SOVEREIGN_POOL,
        SOVEREIGN_POOL_ABI,
        signer
      )
      
      const lpTokenBalance = await poolContract.balanceOf(address)
      debug('LP token balance', lpTokenBalance.toString())
      
      if (lpTokenBalance === 0n) {
        alert('No LP tokens to withdraw')
        return
      }
      
      const withdrawTx = await poolContract.burn(address, {
        gasLimit: 500000n,
        gasPrice: 25000000n
      })
      
      debug('Withdraw tx sent', withdrawTx.hash)
      await withdrawTx.wait()
      alert('✅ Successfully withdrew from pool!')
      await fetchAllData(address, provider)
      
    } catch (error: any) {
      debug('Withdraw from pool failed', error)
      alert(`❌ Withdraw failed: ${error.message || 'Unknown error'}`)
    } finally {
      setWithdrawingFromPool(false)
    }
  }

const handleRepayLoan = async (loanId: number) => {
  if (!isConnected || !address) return
  
  try {
    debug('Starting loan repayment', { loanId })
    
    const ethereum = getEthereum()
    const provider = new BrowserProvider(ethereum as any)
    const signer = await provider.getSigner()
    
    const lendingContract = new Contract(
      CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
      ANTHEM_LENDING_MODULE_ABI,
      signer
    )
    
    // Get loan details first
    const loanData = await lendingContract.getLoan(loanId)
    
    // Calculate total repayment (loan amount + interest) - FRESH CALCULATION
    const interest = await lendingContract.calculateInterest(loanId)
    const totalToRepay = loanData[3] + interest // loanAmount + interest
    
    // Add buffer for interest accrual (0.01 USDC = 10,000 wei)
    const buffer = 10000n
    const amountToApprove = totalToRepay + buffer  // ✅ Define here
    
    debug('Repayment calculation', {
      loanAmount: formatUnits(loanData[3], 6),
      interest: formatUnits(interest, 6),
      totalToRepay: formatUnits(totalToRepay, 6),
      amountToApprove: formatUnits(amountToApprove, 6),  // ✅ Now defined
      buffer: formatUnits(buffer, 6)
    })
    
    // Check USDC balance
    const usdcContract = new Contract(
      CONTRACT_ADDRESSES.UI_MOCK_USDC,
      UI_MOCK_USDC_ABI,
      signer
    )
    
    const usdcBalance = await usdcContract.balanceOf(address)
    debug('USDC balance', {
      balance: formatUnits(usdcBalance, 6),
      needed: formatUnits(amountToApprove, 6)  // ✅ Now defined
    })
    
    if (usdcBalance < amountToApprove) {  // ✅ Now defined
      alert(`Insufficient USDC. Need ${formatUnits(amountToApprove, 6)} USDC, have ${formatUnits(usdcBalance, 6)} USDC`)
      return
    }
    
    // Check and approve USDC if needed
    const currentAllowance = await usdcContract.allowance(address, CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE)
    debug('Current allowance', {
      allowance: formatUnits(currentAllowance, 6),
      needed: formatUnits(amountToApprove, 6)  // ✅ Now defined
    })
    
    if (currentAllowance < amountToApprove) {  // ✅ Now defined
      debug('Approving USDC with buffer', { amount: amountToApprove.toString() })  // ✅ Now defined
      
      // Approve with buffer
      const approveTx = await usdcContract.approve(
        CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
        amountToApprove,  // ✅ Now defined
        { 
          gasLimit: 100000n,
          gasPrice: 25000000n
        }
      )
      
      debug('Approve tx sent', { hash: approveTx.hash })
      const approveReceipt = await approveTx.wait()
      
      if (approveReceipt?.status !== 1) {
        throw new Error('USDC approval failed')
      }
      
      debug('USDC approved with buffer', {})
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    debug('Calling repayLoan', { loanId, totalToRepay: totalToRepay.toString() })
    
    // Call repayLoan with proper gas
    const repayTx = await lendingContract.repayLoan(loanId, {
      gasLimit: 300000n,
      gasPrice: 25000000n
    })
    
    debug('Repay tx sent', { hash: repayTx.hash })
    const receipt = await repayTx.wait()
    debug('Repay receipt', { 
      status: receipt?.status,
      logs: receipt?.logs?.length || 0
    })
    
    if (receipt && receipt.status === 1) {
      const arbiscanLink = `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${repayTx.hash}`
      alert(`✅ Loan #${loanId} repaid successfully!\n\nTransaction: ${repayTx.hash}`)
      await fetchAllData(address, provider)
    } else {
      throw new Error('Repayment transaction failed')
    }
    
  } catch (error: any) {
    debug('Repay loan failed with details', error)
    
    let errorMsg = 'Failed to repay loan'
    
    if (error.message?.includes('Not borrower')) {
      errorMsg = 'You are not the borrower of this loan'
    } else if (error.message?.includes('Loan inactive')) {
      errorMsg = 'Loan is already repaid or inactive'
    } else if (error.message?.includes('Internal JSON-RPC')) {
      errorMsg = 'Network error. Try again with higher gas limit.'
    } else if (error.data) {
      const decoded = decodeCustomError(error.data)
      errorMsg = `Contract error: ${decoded}`
    } else if (error.message) {
      errorMsg = error.message
    }
    
    alert(`❌ ${errorMsg}`)
  }
}

  const refreshAllData = async () => {
    if (!isConnected || !address) return
    
    try {
      debug('Refreshing all data', {})
      const ethereum = getEthereum()
      const provider = new BrowserProvider(ethereum as any)
      await fetchAllData(address, provider)
      debug('Data refresh complete', {})
    } catch (error) {
      debug('Failed to refresh data', error)
    }
  }

  // Calculate values
  const currentBalance = selectedCollateral === 'senior' 
    ? parseFloat(userTokens.senior) 
    : parseFloat(userTokens.junior)
  
  const maxLoan = calculateMaxLoan()
  
const canCreateLoan = () => {
  const collateralNum = parseFloat(collateralAmount) || 0
  const loanNum = parseFloat(loanAmount) || 0
  const currentBalanceNum = currentBalance || 0  // ✅ currentBalance is already a number
  const availableUSDC = parseFloat(lendingStats.availableUSDC) || 0
  
  if (collateralNum <= 0 || loanNum <= 0 || currentBalanceNum <= 0) {
    return false
  }
  
  const maxLoanValue = collateralNum * (currentLTV / 100)
  
  const canCreate = loanNum > 0 && 
                   loanNum <= maxLoanValue &&
                   loanNum <= availableUSDC &&
                   collateralNum > 0 &&
                   collateralNum <= currentBalanceNum
  
  debug('canCreateLoan check', {
    collateralNum,
    loanNum,
    currentBalanceNum,
    maxLoanValue,
    availableUSDC,
    canCreate
  })
  
  return canCreate
}

const [depositing, setDepositing] = useState(false)
const [depositAmount, setDepositAmount] = useState('1000')

const handleDepositToLending = async () => {
  if (!isConnected || !address) return
  
  // Check deposit amount
  const depositNum = parseFloat(depositAmount)
  if (!depositAmount || depositNum <= 0) {
    alert('Enter valid deposit amount')
    return
  }
  
  // Check balance
  const usdcBalanceNum = parseFloat(userTokens.usdc)
  if (depositNum > usdcBalanceNum) {
    alert(`Insufficient USDC. You have ${usdcBalanceNum.toFixed(2)} USDC`)
    return
  }
  
  setDepositing(true)
  
  try {
    const ethereum = getEthereum()
    const provider = new BrowserProvider(ethereum as any)
    const signer = await provider.getSigner()
    
    const lendingContract = new Contract(
      CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
      ANTHEM_LENDING_MODULE_ABI,
      signer
    )
    
    const usdcContract = new Contract(
      CONTRACT_ADDRESSES.UI_MOCK_USDC,
      UI_MOCK_USDC_ABI,
      signer
    )
    
    // Convert to correct units (USDC has 6 decimals)
    const amountBN = parseUnits(depositAmount, 6)  
    // Add buffer (0.01 USDC = 10,000 wei)
    const buffer = 10000n
    const amountWithBuffer = amountBN + buffer  
    debug('Deposit parameters', {
      depositAmount,
      amountBN: amountBN.toString(),
      amountWithBuffer: amountWithBuffer.toString(),
      formatted: formatUnits(amountBN, 6)
    })
    
    // 1. Check allowance
    const currentAllowance = await usdcContract.allowance(address, CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE)
    
    debug('Allowance check', {
      currentAllowance: currentAllowance.toString(),
      needed: amountBN.toString(),
      hasEnough: currentAllowance >= amountBN
    })
    
    if (currentAllowance < amountBN) {
      debug('Approval needed', {})
      
      // Use reasonable allowance (2x the amount)
      const reasonableAllowance = amountBN * 2n
      
      try {
        debug('Approving USDC', { amount: reasonableAllowance.toString() })
        
        // Use gas settings from your working handleDeposit
        const approveTx = await usdcContract.approve(
          CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE,
          reasonableAllowance,
          {
            gasLimit: 100000n,
            gasPrice: 25000000n, // Fixed gas price that works
          }
        )
        
        debug('Approve tx sent', { hash: approveTx.hash })
        const approveReceipt = await approveTx.wait()
        
        if (approveReceipt?.status === 1) {
          debug('Approval confirmed', { blockNumber: approveReceipt.blockNumber })
        } else {
          throw new Error('Approve transaction reverted')
        }
      } catch (approveError: any) {
        debug('Approve failed', approveError)
        throw new Error(`USDC approval failed: ${approveError.message}`)
      }
      
      // Wait for approval to settle
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      debug('Sufficient allowance already exists', {})
    }
    
    debug('Submitting deposit to lending module', {})
    
    // Try deposit with optimized gas (similar to your working handleDeposit)
    try {
      const depositTx = await lendingContract.deposit(amountBN, {
        gasLimit: 800000n, // 800K gas (from your working example)
        gasPrice: 25000000n, // Fixed gas price
      })
      
      debug('Deposit tx sent', { hash: depositTx.hash })
      
      const receipt = await depositTx.wait()
      debug('Deposit confirmed', { blockNumber: receipt?.blockNumber, status: receipt?.status })
      
      if (receipt && receipt.status === 1) {
        const arbiscanLink = `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${depositTx.hash}`
        alert(`✅ ${depositAmount} USDC deposited to lending module!\n\nTransaction: ${depositTx.hash}`)
        
        // Refresh data
        await fetchAllData(address, provider)
      } else {
        throw new Error('Deposit transaction failed')
      }
      
    } catch (depositError: any) {
      debug('Deposit failed, trying with higher gas', depositError)
      
      // Try with even higher gas as last resort
      const depositTx = await lendingContract.deposit(amountBN, {
        gasLimit: 1000000n, // 1M gas
        gasPrice: 30000000n, // Slightly higher gas price
      })
      
      debug('Deposit with higher gas sent', { hash: depositTx.hash })
      await depositTx.wait()
      
      alert(`✅ Deposit successful with higher gas!\nTransaction: ${depositTx.hash}`)
      
      // Refresh data
      await fetchAllData(address, provider)
    }
    
  } catch (error: any) {
    debug('Deposit failed', error)
    
    let errorMsg = 'Deposit failed. '
    
    if (error.message?.includes('Internal JSON-RPC')) {
      errorMsg = 'Network error. Try:\n' +
                '1. Ensure you have enough ETH for gas (at least 0.1 ETH)\n' +
                '2. Try a smaller amount first (e.g., 100 USDC)\n' +
                '3. Wait and try again'
    } else if (error.message?.includes('insufficient balance')) {
      errorMsg = 'Insufficient USDC balance. Try a smaller amount.'
    } else if (error.data) {
      const decoded = decodeCustomError(error.data)
      errorMsg = `Contract error: ${decoded}`
    } else {
      errorMsg += error.message || 'Unknown error'
    }
    
    alert(`❌ ${errorMsg}`)
    
  } finally {
    setDepositing(false)
  }
}

  return (
    <div className="glass-card p-6 rounded-xl border border-purple-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Anthem Lending</h2>
            <p className="text-sm text-gray-400">Borrow against sANTHEM/jANTHEM tokens</p>
          </div>
        </div>
        <button
          onClick={refreshAllData}
          className="p-2 rounded-lg hover:bg-gray-800"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!isConnected ? (
        <div className="mb-4 p-4 border border-dashed border-gray-700 rounded-lg text-center">
          <p className="text-text-muted mb-3">Connect wallet to use lending</p>
          <button
            onClick={connectWallet}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Lending Pool Status */}
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-gray-900 to-black border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Lending Pool</h3>
              <div className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-300">
                κ_t = {priorityScore}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gray-900/50">
                <div className="text-xs text-gray-500 mb-1">Available USDC</div>
                <div className="text-lg font-bold text-green-400">
                  {lendingStats.availableUSDC}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/50">
                <div className="text-xs text-gray-500 mb-1">Active Loans</div>
                <div className="text-lg font-bold text-yellow-400">
                  {lendingStats.activeLoans}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Total Collateral:</span>
                <span>{lendingStats.totalCollateral} USDC value</span>
              </div>
              <div className="flex justify-between">
                <span>Total Borrowed:</span>
                <span>{lendingStats.totalBorrowed} USDC</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
  <div className="flex items-center gap-2 mb-2">
    <AlertTriangle className="w-4 h-4 text-yellow-400" />
    <span className="text-sm font-medium text-yellow-300">Lending Pool Empty</span>
  </div>
  <p className="text-xs text-gray-400 mb-3">
    No USDC available to lend. Deposit USDC to enable borrowing.
  </p>
  <div className="flex gap-2">
    <input
      type="number"
      value={depositAmount}
      onChange={(e) => setDepositAmount(e.target.value)}
      className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-sm"
      placeholder="USDC amount"
    />
    <button
      onClick={handleDepositToLending}
      disabled={depositing}
      className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
    >
      {depositing ? 'Depositing...' : 'Deposit'}
    </button>
  </div>
</div>

          {/* Your Tokens */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Your Tokens</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-900/10">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">sANTHEM</span>
                </div>
                <div className="text-lg font-bold text-blue-300">{userTokens.senior}</div>
              </div>
              <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-900/10">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">jANTHEM</span>
                </div>
                <div className="text-lg font-bold text-purple-300">{userTokens.junior}</div>
              </div>
            </div>
            
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-900/10 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">Pool LP Tokens</span>
              </div>
              <div className="text-lg font-bold text-cyan-300">{userTokens.lpTokens}</div>
            </div>
            
            {parseFloat(userTokens.lpTokens) > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownUp className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-medium text-yellow-300">Need Collateral Tokens?</h4>
                </div>
                <p className="text-xs text-yellow-200 mb-3">
                  You have LP tokens. Withdraw from pool to get sANTHEM/jANTHEM tokens for collateral.
                </p>
                <button
                  onClick={handleWithdrawFromPool}
                  disabled={withdrawingFromPool}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:opacity-90 disabled:opacity-50 text-xs font-medium"
                >
                  {withdrawingFromPool ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
                      Withdrawing...
                    </>
                  ) : (
                    'Withdraw from Pool'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Loan Creation */}
          <div className="space-y-4">
            {/* Collateral Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Collateral Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedCollateral('senior')
                    fetchLTVInfo(new BrowserProvider(getEthereum() as any))
                  }}
                  className={`p-3 rounded-xl border ${selectedCollateral === 'senior'
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-700 bg-gray-900/50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">sANTHEM</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    LTV: {currentLTV.toFixed(1)}%
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedCollateral('junior')
                    fetchLTVInfo(new BrowserProvider(getEthereum() as any))
                  }}
                  className={`p-3 rounded-xl border ${selectedCollateral === 'junior'
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-gray-700 bg-gray-900/50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="font-medium">jANTHEM</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    LTV: {currentLTV.toFixed(1)}%
                  </div>
                </button>
              </div>
            </div>

            {/* Your Active Loans */}
            {userLoans.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Your Active Loans</h3>
                <div className="space-y-3">
                  {userLoans.filter(loan => loan.active).map((loan) => (
                    <div key={loan.id} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs text-gray-400">Loan #{loan.id}</div>
                        <div className={`text-xs px-2 py-1 rounded ${loan.active ? 'bg-green-900/30 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                          {loan.active ? 'ACTIVE' : 'REPAID'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <div className="text-gray-500 text-xs">Collateral</div>
                          <div className="font-medium">
                            {loan.collateralAmount} {loan.collateralToken === CONTRACT_ADDRESSES.ANTHEM_SENIOR ? 'sANTHEM' : 'jANTHEM'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Borrowed</div>
                          <div className="font-medium text-green-400">{loan.loanAmount} USDC</div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Due Date:</span>
                          <span>{loan.dueDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Interest Accrued:</span>
                          <span className="text-yellow-300">{loan.currentInterest} USDC</span>
                        </div>
                        <div className="flex justify-between mt-1 pt-1 border-t border-gray-700">
                          <span className="font-medium">Total to Repay:</span>
                          <span className="font-bold text-green-400">{loan.totalToRepay} USDC</span>
                        </div>
                      </div>
                      
                      {loan.active && (
                        <button
                          onClick={() => handleRepayLoan(loan.id)}
                          className="w-full mt-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-xs font-medium"
                        >
                          Repay Loan
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collateral Amount */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-400">Collateral Amount</label>
                <button
                  onClick={() => {
                    setCollateralAmount(currentBalance.toString())
                    updateLoanAmount(currentBalance.toString())
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Max: {currentBalance.toFixed(4)}
                </button>
              </div>
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => {
                  setCollateralAmount(e.target.value)
                  updateLoanAmount(e.target.value)
                }}
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700"
                placeholder="0.0"
                step="0.1"
              />
            </div>
            
            {/* Loan Amount */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-400">Borrow USDC</label>
                <button
                  onClick={() => setLoanAmount(maxLoan.toFixed(2))}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  Max: {maxLoan.toFixed(2)}
                </button>
              </div>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700"
                placeholder="0.0"
                step="0.1"
              />
            </div>

            {/* Debug Info (hidden by default) */}
            <details className="text-xs text-gray-500 border border-gray-800 rounded-lg p-2">
              <summary>Debug Info</summary>
              <div className="mt-2 space-y-1">
                <div>Current Balance: {currentBalance}</div>
                <div>Max Loan: {maxLoan}</div>
                <div>Can Create Loan: {canCreateLoan.toString()}</div>
                <div>Available USDC: {lendingStats.availableUSDC}</div>
                <div>Selected: {selectedCollateral}</div>
              </div>
            </details>

            {/* Create Loan Button */}
            <button
  onClick={handleCreateLoan}
  disabled={creatingLoan || !canCreateLoan()}  // ✅ Add parentheses to call the function
  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
>
  {creatingLoan ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Creating Loan...
    </>
  ) : !canCreateLoan() ? (  // ✅ Also update here
    <>
      <XCircle className="w-4 h-4" />
      Adjust Amounts
    </>
  ) : (
    <>
      <Banknote className="w-4 h-4" />
      Create Loan
    </>
  )}
</button>
          </div>
        </>
      )}
    </div>
  )
}