import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { API_BASE_URL } from '../config';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalTransactions: number;
  totalRevenue: number;
  totalWithdrawals: number;
}

interface User {
  id: string;
  email?: string;
  phoneNumber?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  emailVerified: boolean;
  role: string;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  wallet: { balance: number } | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  paymentMethod: string | null;
  paymentProof: string | null;
  accountNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { 
    email?: string; 
    phoneNumber?: string | null;
    telegramUsername?: string | null;
    telegramFirstName?: string | null;
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'transactions' | 'activity' | 'pending' | 'messages'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Transaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Messaging state
  const [messageType, setMessageType] = useState<'individual' | 'broadcast'>('individual');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageResult, setMessageResult] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Search, filter, and pagination state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (activeTab !== 'messages') {
      fetchData();
    }
  }, [token, navigate, activeTab, search, roleFilter, bannedFilter, typeFilter, page, limit]);

  // Fetch users when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages' && token) {
      const fetchUsersForMessaging = async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const res = await fetch(`${API_BASE_URL}/api/admin/users?limit=1000`, { headers });
          const data = await res.json();
          console.log('Fetched users for messaging:', data.users);
          setUsers(data.users || []);
        } catch (error) {
          console.error('Failed to fetch users for messaging:', error);
        }
      };
      fetchUsersForMessaging();
    }
  }, [activeTab, token]);

  // Fetch pending data on mount for badge
  useEffect(() => {
    if (!token) return;
    const fetchPendingData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [depositsRes, withdrawalsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/deposits/pending`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/withdrawals/pending`, { headers })
        ]);
        const deposits = await depositsRes.json();
        const withdrawals = await withdrawalsRes.json();
        setPendingDeposits(deposits);
        setPendingWithdrawals(withdrawals);
      } catch (error) {
        console.error('Failed to fetch pending data:', error);
      }
    };
    fetchPendingData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'stats') {
        const res = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers });
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'users') {
        const params = new URLSearchParams({
          search,
          role: roleFilter,
          isBanned: bannedFilter,
          page: page.toString(),
          limit: limit.toString()
        });
        const res = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, { headers });
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
      } else if (activeTab === 'transactions') {
        const params = new URLSearchParams({
          search,
          type: typeFilter,
          page: page.toString(),
          limit: limit.toString()
        });
        const res = await fetch(`${API_BASE_URL}/api/admin/transactions?${params}`, { headers });
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      } else if (activeTab === 'activity') {
        const params = new URLSearchParams({
          search,
          page: page.toString(),
          limit: limit.toString()
        });
        const res = await fetch(`${API_BASE_URL}/api/admin/activity?${params}`, { headers });
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      } else if (activeTab === 'pending') {
        const [depositsRes, withdrawalsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/deposits/pending`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/withdrawals/pending`, { headers })
        ]);
        const deposits = await depositsRes.json();
        const withdrawals = await withdrawalsRes.json();
        setPendingDeposits(deposits);
        setPendingWithdrawals(withdrawals);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBanned, banReason: isBanned ? 'Admin ban' : null }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleApproveDeposit = async (transactionId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/deposits/${transactionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to approve deposit:', error);
    }
  };

  const handleRejectDeposit = async (transactionId: string, adminNote: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/deposits/${transactionId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to reject deposit:', error);
    }
  };

  const handleApproveWithdrawal = async (transactionId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/withdrawals/${transactionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
    }
  };

  const handleRejectWithdrawal = async (transactionId: string, adminNote: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/withdrawals/${transactionId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-6 md:mb-8 border-b border-slate-700 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
              activeTab === 'users' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
              activeTab === 'transactions' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
              activeTab === 'activity' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap relative ${
              activeTab === 'pending' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pending
            {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {pendingDeposits.length + pendingWithdrawals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
              activeTab === 'messages' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Messages
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Active Users</h3>
              <p className="text-3xl font-bold text-emerald-400">{stats.activeUsers}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Bets</h3>
              <p className="text-3xl font-bold text-violet-400">{stats.totalBets}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Transactions</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.totalTransactions}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-emerald-400">{stats.totalRevenue.toFixed(2)} ETB</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-2">Total Withdrawals</h3>
              <p className="text-3xl font-bold text-red-400">{stats.totalWithdrawals.toFixed(2)} ETB</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full md:flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="w-full md:w-auto bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={bannedFilter}
                  onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
                  className="w-full md:w-auto bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Banned</option>
                  <option value="false">Active</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm text-white">
                      {user.telegramUsername ? (
                        <div>
                          <div className="font-semibold">@{user.telegramUsername}</div>
                          <div className="text-xs text-slate-400">{user.telegramFirstName || ''}</div>
                        </div>
                      ) : user.email ? (
                        user.email
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.phoneNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-emerald-400">{user.wallet?.balance.toFixed(2) || '0.00'} ETB</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleBanUser(user.id, !user.isBanned)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          user.isBanned
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-slate-400 text-sm">Items per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full md:flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                  className="w-full md:w-auto bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' :
                        tx.type === 'WITHDRAW' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">{tx.amount.toFixed(2)} ETB</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {tx.user.telegramUsername ? (
                        <div>
                          <div className="font-semibold">@{tx.user.telegramUsername}</div>
                          <div className="text-xs text-slate-400">{tx.user.telegramFirstName || ''}</div>
                        </div>
                      ) : tx.user.email ? (
                        tx.user.email
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-slate-400 text-sm">Items per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            {/* Search */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full md:flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Activity Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' :
                        tx.type === 'WITHDRAW' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">{tx.amount.toFixed(2)} ETB</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {tx.user.telegramUsername ? (
                        <div>
                          <div className="font-semibold">@{tx.user.telegramUsername}</div>
                          <div className="text-xs text-slate-400">{tx.user.telegramFirstName || ''}</div>
                        </div>
                      ) : tx.user.email ? (
                        tx.user.email
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-slate-400 text-sm">Items per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Pending Deposits */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Pending Deposits</h2>
              {pendingDeposits.length === 0 ? (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
                  No pending deposits
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Proof</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {pendingDeposits.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {tx.user.telegramUsername ? (
                              <div>
                                <div className="font-semibold">@{tx.user.telegramUsername}</div>
                                <div className="text-xs text-slate-400">{tx.user.telegramFirstName || ''}</div>
                              </div>
                            ) : tx.user.email ? (
                              tx.user.email
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-white">{tx.amount.toFixed(2)} ETB</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{tx.paymentMethod}</td>
                          <td className="px-6 py-4 text-sm">
                            {tx.paymentProof && (
                              <a href={`${API_BASE_URL}${tx.paymentProof}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                                View Proof
                              </a>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              onClick={() => handleApproveDeposit(tx.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const note = prompt('Enter rejection reason (optional):');
                                if (note !== null) handleRejectDeposit(tx.id, note);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm cursor-pointer"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Withdrawals */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Pending Withdrawals</h2>
              {pendingWithdrawals.length === 0 ? (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
                  No pending withdrawals
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Account</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {pendingWithdrawals.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {tx.user.telegramUsername ? (
                              <div>
                                <div className="font-semibold">@{tx.user.telegramUsername}</div>
                                <div className="text-xs text-slate-400">{tx.user.telegramFirstName || ''}</div>
                              </div>
                            ) : tx.user.email ? (
                              tx.user.email
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-white">{tx.amount.toFixed(2)} ETB</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{tx.paymentMethod}</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{tx.accountNumber}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(tx.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const note = prompt('Enter rejection reason (optional):');
                                if (note !== null) handleRejectWithdrawal(tx.id, note);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm cursor-pointer"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Send Telegram Messages</h2>
              
              {/* Message Type Toggle */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setMessageType('individual')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    messageType === 'individual' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Send to Individual User
                </button>
                <button
                  onClick={() => setMessageType('broadcast')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    messageType === 'broadcast' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Broadcast to All Users
                </button>
              </div>

              {/* Individual User Message */}
              {messageType === 'individual' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Search User</label>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by username or email..."
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Select User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="">Select a user...</option>
                      {users
                        .filter(u => 
                          !userSearch || 
                          u.telegramUsername?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.telegramUsername ? `@${user.telegramUsername}` : user.email || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Message (optional if photo provided)</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Enter your message..."
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedUserId || (!customMessage && !photoFile)) {
                        setMessageResult({ text: 'Please select a user and enter a message or select a photo', type: 'error' });
                        return;
                      }
                      setMessageLoading(true);
                      setMessageResult(null);
                      try {
                        const formData = new FormData();
                        formData.append('userId', selectedUserId);
                        formData.append('message', customMessage);
                        if (photoFile) {
                          formData.append('photo', photoFile);
                        }

                        const res = await fetch(`${API_BASE_URL}/api/admin/send-message`, {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setMessageResult({ text: data.message, type: 'success' });
                          setCustomMessage('');
                          setPhotoFile(null);
                          setSelectedUserId('');
                        } else {
                          setMessageResult({ text: data.message || 'Failed to send message', type: 'error' });
                        }
                      } catch (error) {
                        setMessageResult({ text: 'Failed to send message', type: 'error' });
                      } finally {
                        setMessageLoading(false);
                      }
                    }}
                    disabled={messageLoading}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {messageLoading ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              )}

              {/* Broadcast Message */}
              {messageType === 'broadcast' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Message (optional if photo provided)</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Enter your broadcast message..."
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!customMessage && !photoFile) {
                        setMessageResult({ text: 'Please enter a message or select a photo', type: 'error' });
                        return;
                      }
                      setMessageLoading(true);
                      setMessageResult(null);
                      try {
                        const formData = new FormData();
                        formData.append('message', customMessage);
                        if (photoFile) {
                          formData.append('photo', photoFile);
                        }

                        const res = await fetch(`${API_BASE_URL}/api/admin/broadcast`, {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setMessageResult({ text: data.message, type: 'success' });
                          setCustomMessage('');
                          setPhotoFile(null);
                        } else {
                          setMessageResult({ text: data.message || 'Failed to send broadcast', type: 'error' });
                        }
                      } catch (error) {
                        setMessageResult({ text: 'Failed to send broadcast', type: 'error' });
                      } finally {
                        setMessageLoading(false);
                      }
                    }}
                    disabled={messageLoading}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {messageLoading ? 'Sending...' : 'Send Broadcast'}
                  </button>
                </div>
              )}

              {/* Message Result */}
              {messageResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  messageResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {messageResult.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
