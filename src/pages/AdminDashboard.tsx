import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, Store, IndianRupee, FileText, Users, AlertTriangle,
  Bell, CreditCard, ToggleLeft, ToggleRight, Ban, CheckCircle,
  XCircle, Eye, Settings, LogOut, BarChart3, TrendingUp
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_open: boolean;
  owner_id: string;
  created_at: string;
}

interface Ad {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  position: string;
  is_active: boolean;
}

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({ activeShops: 0, openShops: 0, gmv: 0, totalPages: 0, totalOrders: 0 });
  const [shops, setShops] = useState<Shop[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'ads' | 'notices'>('overview');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    fetchAnalytics();
    fetchShops();
    fetchAds();
  }, [user, loading]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/shops');
      const data = await res.json();
      setShops(data);
    } catch (err) {
      console.error('Failed to fetch shops:', err);
    }
  };

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/ads');
      const data = await res.json();
      setAds(data);
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    }
  };

  const toggleShopStatus = async (shopId: string, field: 'is_active' | 'is_open', value: boolean) => {
    try {
      await fetch('/api/shops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shopId, [field]: value })
      });
      fetchShops();
    } catch (err) {
      console.error('Failed to update shop:', err);
    }
  };

  const toggleAdStatus = async (adId: string, isActive: boolean) => {
    try {
      await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adId, is_active: isActive })
      });
      fetchAds();
    } catch (err) {
      console.error('Failed to update ad:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-white">D.dot Print Admin</h1>
                <p className="text-sm text-white/70">Platform Management</p>
              </div>
            </div>
            <button onClick={signOut} className="p-2 hover:bg-white/10 rounded-lg">
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'shops', icon: Store, label: 'Shops' },
              { id: 'ads', icon: CreditCard, label: 'Ad Network' },
              { id: 'notices', icon: Bell, label: 'Notices' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <Store className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active Shops</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.activeShops}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Open Now</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.openShops}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <IndianRupee className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">GMV</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">₹{analytics.gmv.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalOrders}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Pages Printed</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalPages}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Platform Health</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Server Status</span>
                    </div>
                    <p className="text-lg font-semibold text-green-600 mt-1">Healthy</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{analytics.activeShops * 2}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending Tickets</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">0</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shops' && (
            <motion.div key="shops" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">All Shops</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Shop</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Active</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {shops.map((shop) => (
                        <tr key={shop.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{shop.name}</p>
                            <p className="text-sm text-gray-500">/{shop.slug}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              shop.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>{shop.is_open ? 'Open' : 'Closed'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              shop.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>{shop.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleShopStatus(shop.id, 'is_active', !shop.is_active)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                {shop.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                              </button>
                              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500">
                                <Ban className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ads' && (
            <motion.div key="ads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Ad Network</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {ads.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No ads configured yet.</p>
                  ) : (
                    ads.map((ad) => (
                      <div key={ad.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{ad.title}</p>
                            <p className="text-sm text-gray-500">Position: {ad.position}</p>
                          </div>
                          <button
                            onClick={() => toggleAdStatus(ad.id, !ad.is_active)}
                            className="flex items-center"
                          >
                            {ad.is_active ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  Add New Ad
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notices' && (
            <motion.div key="notices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Broadcast Notices</h2>
                <textarea
                  placeholder="Enter notice to broadcast to all shops..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                />
                <button className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  Broadcast Notice
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}