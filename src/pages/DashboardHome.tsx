import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  Printer, Store, IndianRupee, FileText, Users, Truck,
  Clock, CheckCircle, AlertCircle, TrendingUp, Calendar,
  QrCode, Settings, Eye, LogOut, RefreshCw, Volume2
} from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  order_items?: { pages: number; copies: number }[];
}

export default function DashboardHome() {
  const { user, shop, signOut, refreshAuth, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayStats, setTodayStats] = useState({ revenue: 0, orders: 0, pages: 0 });
  const [weekStats, setWeekStats] = useState({ revenue: 0, orders: 0, pages: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
    if (!loading && user && !shop) navigate('/onboarding');
    if (shop) {
      fetchOrders();
      fetchStats();
    }
  }, [user, shop, loading]);

  const fetchOrders = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/orders?shop_id=${shop.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  };

  const fetchStats = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/analytics?shop_id=${shop.id}`);
      const data = await res.json();
      
      // Calculate today's stats
      const today = new Date().toDateString();
      const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
      const todayPages = todayOrders.reduce((sum, o) => {
        return sum + (o.order_items?.reduce((p, i) => p + i.pages * i.copies, 0) || 0);
      }, 0);
      
      setTodayStats({ revenue: todayRevenue, orders: todayOrders.length, pages: todayPages });
      setWeekStats({ 
        revenue: data.totalRevenue || 0, 
        orders: data.totalOrders || 0, 
        pages: data.totalPages || 0 
      });
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' && o.payment_status === 'pending');
  const activeOrders = orders.filter(o => o.status === 'printing' || (o.status === 'pending' && o.payment_status === 'paid'));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold">{shop?.name || 'My Shop'}</h1>
                <p className="text-xs text-white/70">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 bg-white/10 rounded-lg">
                <Volume2 className={`w-5 h-5 ${soundEnabled ? '' : 'opacity-50'}`} />
              </button>
              <button onClick={() => setShowQR(true)} className="p-2 bg-white/10 rounded-lg">
                <QrCode className="w-5 h-5" />
              </button>
              <button onClick={signOut} className="p-2 bg-white/10 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <IndianRupee className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{todayStats.revenue}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Orders</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{todayStats.orders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <Printer className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Pages</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{todayStats.pages}</p>
          </div>
        </div>

        {/* 7 Day Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-900 dark:text-white">7 Day Summary</span>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">₹{weekStats.revenue}</p>
              <p className="text-xs text-gray-500">Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.orders}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.pages}</p>
              <p className="text-xs text-gray-500">Pages</p>
            </div>
          </div>
        </div>

        {/* Pending Orders Alert */}
        {pendingOrders.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-700 dark:text-red-300">Pending Approval ({pendingOrders.length})</span>
            </div>
            <div className="space-y-2">
              {pendingOrders.slice(0, 3).map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">₹{order.total} • {order.payment_method}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium">Approve</button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium">Reject</button>
                  </div>
                </div>
              ))}
            </div>
            {pendingOrders.length > 3 && (
              <button onClick={() => navigate('/orders')} className="w-full mt-2 text-center text-red-600 font-medium text-sm">
                View all {pendingOrders.length} pending orders
              </button>
            )}
          </div>
        )}

        {/* Active Orders */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Printing Now</span>
            </div>
            <span className="text-sm text-gray-500">{activeOrders.length} active</span>
          </div>
          {activeOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No active orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeOrders.slice(0, 5).map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">#{order.id.slice(-6)}</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">Printing</span>
                  </div>
                  <button className="w-full mt-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                    Mark Complete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex justify-around">
            <button className="flex flex-col items-center gap-1 text-indigo-600">
              <Store className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button onClick={() => navigate('/orders')} className="flex flex-col items-center gap-1 text-gray-500">
              <Clock className="w-5 h-5" />
              <span className="text-xs">Orders</span>
            </button>
            <button onClick={() => navigate('/settings')} className="flex flex-col items-center gap-1 text-gray-500">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </button>
            <button onClick={() => navigate('/analytics')} className="flex flex-col items-center gap-1 text-gray-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQR(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">Shop QR Code</h3>
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200 flex items-center justify-center">
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-32 h-32 text-gray-800" />
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              {window.location.origin}/shop/{shop?.slug}
            </p>
            <button className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-medium">
              Download QR
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}