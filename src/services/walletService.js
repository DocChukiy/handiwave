import { getSupabaseClient } from '../lib/supabaseClient.js'

function formatMoney(value, currency = 'NGN') {
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function formatDate(value) {
  if (!value) {
    return 'Pending'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function mapWalletRow(wallet) {
  return {
    availableBalance: Number(wallet.balance) || 0,
    currency: wallet.currency || 'NGN',
    escrowBalance: Number(wallet.escrow_balance) || 0,
    id: wallet.id,
    totalCredited: Number(wallet.total_credited) || 0,
    totalDebited: Number(wallet.total_debited) || 0,
  }
}

export function mapWalletTransactionRow(transaction) {
  const currency = transaction.currency || 'NGN'

  return {
    amount: Number(transaction.amount) || 0,
    amountLabel: formatMoney(transaction.amount, currency),
    bookingId: transaction.booking_id || '',
    createdAt: transaction.created_at || '',
    currency,
    description: transaction.description || 'Wallet transaction',
    id: transaction.id,
    processedAt: transaction.processed_at || '',
    provider: transaction.provider || '',
    reference: transaction.reference || transaction.provider_reference || '',
    status: transaction.status || 'pending',
    time: formatDate(transaction.created_at),
    type: transaction.type || 'top_up',
  }
}

export function mapWithdrawalRow(withdrawal) {
  const currency = withdrawal.currency || 'NGN'

  return {
    accountName: withdrawal.account_name || '',
    accountNumber: withdrawal.account_number || '',
    amount: Number(withdrawal.amount) || 0,
    amountLabel: formatMoney(withdrawal.amount, currency),
    bankName: withdrawal.bank_name || '',
    createdAt: withdrawal.created_at || '',
    currency,
    id: withdrawal.id,
    payoutMethod: withdrawal.payout_method || 'manual',
    processedAt: withdrawal.processed_at || '',
    rejectionReason: withdrawal.rejection_reason || '',
    requestedAt: withdrawal.requested_at || '',
    status: withdrawal.status || 'pending',
    time: formatDate(withdrawal.requested_at),
    transactionId: withdrawal.transaction_id || '',
    transferStatus: withdrawal.transfer_status || '',
  }
}

export async function getWalletOverview(profileId) {
  if (!profileId) {
    return {
      data: {
        transactions: [],
        wallet: null,
        withdrawals: [],
      },
      error: new Error('You must be logged in to view your wallet.'),
    }
  }

  const supabase = getSupabaseClient()
  const walletResult = await supabase
    .from('wallets')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (walletResult.error) {
    return {
      data: null,
      error: walletResult.error,
    }
  }

  if (!walletResult.data) {
    const { error: ensureError } = await supabase.rpc('ensure_wallet_for_profile', {
      target_profile_id: profileId,
    })

    if (ensureError) {
      return {
        data: null,
        error: ensureError,
      }
    }

    return getWalletOverview(profileId)
  }

  const wallet = mapWalletRow(walletResult.data)
  const [transactionResult, withdrawalResult] = await Promise.all([
    supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wallet_withdrawal_requests')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false }),
  ])

  return {
    data: {
      transactions: (transactionResult.data || []).map(mapWalletTransactionRow),
      wallet,
      withdrawals: (withdrawalResult.data || []).map(mapWithdrawalRow),
    },
    error: transactionResult.error || withdrawalResult.error,
  }
}

export async function requestWalletWithdrawal({
  accountName,
  accountNumber,
  amount,
  bankName,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('request_wallet_withdrawal', {
    account_name: accountName,
    account_number: accountNumber,
    bank_name: bankName,
    withdrawal_amount: Number(amount),
  })

  return {
    data,
    error,
  }
}
