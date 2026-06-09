import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

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
  email: string;
  phoneNumber: string | null;
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
  createdAt: string;
  user: { email: string; phoneNumber: string | null };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'transactions' | 'activity'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchData();
  }, [token, navigate, activeTab, search, roleFilter, bannedFilter, typeFilter, page, limit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'stats') {
        const res = await fetch('http://localhost:5000/api/admin/stats', { headers });
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
        const res = await fetch(`http://localhost:5000/api/admin/users?${params}`, { headers });
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
        const res = await fetch(`http://localhost:5000/api/admin/transactions?${params}`, { headers });
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      } else if (activeTab === 'activity') {
        const params = new URLSearchParams({
          search,
          page: page.toString(),
          limit: limit.toString()
        });
        const res = await fetch(`http://localhost:5000/api/admin/activity?${params}`, { headers });
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/admin/users/${userId}/ban`, {
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
      await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700 pb-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'stats' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'users' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'transactions' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'activity' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Activity
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
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1 min-w-[200px] bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={bannedFilter}
                  onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Banned</option>
                  <option value="false">Active</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Email</th>
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
                    <td className="px-6 py-4 text-sm text-white">{user.email}</td>
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1 min-w-[200px] bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
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
                    <td className="px-6 py-4 text-sm text-slate-300">{tx.user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1 min-w-[200px] bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Activity Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
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
                    <td className="px-6 py-4 text-sm text-slate-300">{tx.user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
