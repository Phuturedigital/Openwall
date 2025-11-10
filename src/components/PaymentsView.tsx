import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Clock, X } from 'lucide-react';
import { supabase, Transaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingLogo } from './LoadingLogo';

export function PaymentsView() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadTransactions();
    }
  }, [profile]);

  async function loadTransactions() {
    if (!profile) return;

    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    setTransactions(data || []);
    setLoading(false);
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (cents: number) => {
    return `R${(cents / 100).toFixed(2)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'failed':
        return <X className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const totalSpent = transactions
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your unlocks and priority posts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{formatAmount(totalSpent)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">Successful Payments</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
              {transactions.filter((t) => t.status === 'paid').length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Transactions</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{transactions.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingLogo className="w-10 h-10" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No payment history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {getStatusIcon(transaction.status)}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {transaction.kind === 'unlock' ? 'Contact Unlock' : 'Priority Post'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(transaction.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(transaction.amount)}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
