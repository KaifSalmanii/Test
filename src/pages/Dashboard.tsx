import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { 
  Printer, Settings, Users, Wallet, BarChart3, QrCode, LogOut, 
  Clock, CheckCircle, XCircle, AlertCircle, Volume2, RefreshCw,
  ChevronDown, ChevronUp, Eye, EyeOff, ToggleLeft, ToggleRight,
  IndianRupee, FileText, Truck, Store, CreditCard, Phone, MapPin
} from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_type: 'pickup' | 'delivery';
  status: 'pending' | 'printing' | 'completed' | 'rejected';
  payment_method: 'auto_upi' | 'manual_upi' | 'cash';
  payment_status: 'pending' | 'paid';
  total: number;
  subtotal: number;
  gst: number;
  delivery_fee: number;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  document_name: string;
  document_url: string;
  pages: number;
  copies: number;
  print_type: 'bw' | 'color';
  paper_size: 'A4' | 'A3' | 'Legal';
  sides: 'single' | 'double';
  price: number;
}

export default function Dashboard() {
  const { user, shop, role, permissions, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalOrders: 0, totalPages: 0, completedOrders: 0 });
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'staff' | 'wallet' | 'analytics'>('orders');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [staff, setStaff] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (shop) {
      fetchOrders();
      fetchAnalytics();
      if (activeTab === 'staff') fetchStaff();
      if (activeTab === 'wallet') fetchWallets();
    }
  }, [user, shop, activeTab]);

  // Realtime subscription for orders
  useEffect(() => {
    if (!shop) return;

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `shop_id=eq.${shop.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as Order, ...prev]);
          // Play sound for manual payment orders
          if (soundEnabled && (payload.new as Order).payment_method !== 'auto_upi') {
            playAlertSound();
          }
        }
        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
        }
        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop, soundEnabled]);

  const playAlertSound = () => {
    const audio = new Audio('/uploads/alert.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const fetchOrders = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/orders?shop_id=${shop.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const fetchAnalytics = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/analytics?shop_id=${shop.id}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchStaff = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/staff?shop_id=${shop.id}`);
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const fetchWallets = async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/wallet?shop_id=${shop.id}`);
      const data = await res.json();
      setWallets(data);
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    await fetchAnalytics();
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, status: 'printing' | 'completed' | 'rejected', paymentStatus?: 'paid') => {
    try {
      const updates: Record<string, string> = { status };
      if (paymentStatus) updates.payment_status = paymentStatus;
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, ...updates })
      });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const updateShopSettings = async (updates: Record<string, unknown>) => {
    if (!shop) return;
    try {
      await fetch('/api/shops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shop.id, ...updates })
      });
      // Refresh shop data
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const authRes = await fetch('/api/auth', {
          headers: { Authorization: `Bearer ${data.session.access_token}` }
        });
        const authData = await authRes.json();
        // Update context would need to be implemented
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">No Shop Assigned</h1>
          <p className="text-gray-500 mt-2">You don't have a shop assigned to your account.</p>
          <button onClick={signOut} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Sign Out</button>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' && o.payment_status === 'pending');
  const activeOrders = orders.filter(o => o.status === 'printing' || (o.status === 'pending' && o.payment_status === 'paid'));
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'rejected');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
                <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">{shop.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {role === 'owner' ? 'Owner' : 'Staff'} Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-600" /> : <Volume2 className="w-5 h-5 text-gray-400" />}
              </button>
              <button onClick={signOut} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <LogOut className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            {[
              { id: 'orders', icon: Clock, label: 'Orders' },
              { id: 'settings', icon: Settings, label: 'Settings', ownerOnly: true },
              { id: 'staff', icon: Users, label: 'Staff', ownerOnly: true },
              { id: 'wallet', icon: Wallet, label: 'Khata', ownerOnly: true },
              { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            ].filter(tab => !tab.ownerOnly || role === 'owner').map((tab) => (
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
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Pending Orders (Need Approval) */}
              {pendingOrders.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <h2 className="font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Pending Approval ({pendingOrders.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingOrders.map((order) => (
                      <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                            <p className="text-sm text-gray-500">{order.customer_phone}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                order.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>{
                                order.payment_method === 'cash' ? 'Cash' : 'UPI Screenshot'
                              }</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'printing', 'paid')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                            >
                              <XCircle className="w-4 h-4 inline mr-1" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Orders */}
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  Active Orders ({activeOrders.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">#{order.id.slice(-8).toUpperCase()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'printing' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{
                          order.status === 'printing' ? 'Printing' : 'Queued'
                        }</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{item.document_name}</span>
                            <span>{item.copies}× {item.print_type === 'color' ? 'Color' : 'B&W'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="flex items-center gap-1 text-gray-500">
                          {order.delivery_type === 'pickup' ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                          {order.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">₹{order.total.toFixed(2)}</span>
                      </div>
                      {order.status === 'printing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Orders */}
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Completed ({completedOrders.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {completedOrders.slice(0, 8).map((order) => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm opacity-75">
                      <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">₹{order.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && role === 'owner' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Shop Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Shop Status</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Shop Open</span>
                    <button
                      onClick={() => updateShopSettings({ is_open: !shop.is_open })}
                      className="flex items-center gap-2"
                    >
                      {shop.is_open ? <ToggleRight className="w-8 h-8 text-green-600" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Delivery Enabled</span>
                    <button
                      onClick={() => updateShopSettings({ delivery_enabled: !shop.delivery_enabled })}
                      className="flex items-center gap-2"
                    >
                      {shop.delivery_enabled ? <ToggleRight className="w-8 h-8 text-green-600" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Color Ink Available</span>
                    <button
                      onClick={() => updateShopSettings({ color_ink_available: !shop.color_ink_available })}
                      className="flex items-center gap-2"
                    >
                      {shop.color_ink_available ? <ToggleRight className="w-8 h-8 text-green-600" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Pricing Rates</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">B&W A4 (per page)</label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <input type="number" defaultValue={shop.rates?.bw_a4 || 2} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Color A4 (per page)</label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <input type="number" defaultValue={shop.rates?.color_a4 || 10} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">B&W A3 (per page)</label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <input type="number" defaultValue={shop.rates?.bw_a3 || 4} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Color A3 (per page)</label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <input type="number" defaultValue={shop.rates?.color_a3 || 20} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Delivery (per km)</label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <input type="number" defaultValue={shop.rates?.delivery_per_km || 5} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">GST Rate (%)</label>
                    <input type="number" defaultValue={shop.settings?.gst_rate || 18} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg" />
                  </div>
                </div>
                <button className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  Save Rates
                </button>
              </div>

              {/* QR Code */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">QR Standee</h2>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-800" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Customer scan URL:</p>
                    <p className="text-indigo-600 font-medium">ddotprint.com/shop/{shop.slug}</p>
                    <button className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium">
                      Download QR
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <IndianRupee className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{analytics.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalOrders}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <Printer className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Pages Printed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalPages}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.completedOrders}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && role === 'owner' && (
            <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Staff Members</h2>
                {staff.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No staff members added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {staff.map((s: { id: string; role: string; permissions: Record<string, boolean> }) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Staff #{s.id.slice(-4)}</p>
                          <p className="text-sm text-gray-500">{s.role}</p>
                        </div>
                        <button className="text-red-500 hover:text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  Add Staff
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'wallet' && role === 'owner' && (
            <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">B2B Khata / Wallet</h2>
                {wallets.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No B2B customers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {wallets.map((w: { id: string; customer_name: string; customer_phone: string; balance: number }) => (
                      <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{w.customer_name}</p>
                          <p className="text-sm text-gray-500">{w.customer_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">₹{w.balance.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Balance</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  Add Customer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}