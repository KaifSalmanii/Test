'use client';

import React, { useState } from 'react';
import { ArrowLeft, Printer, Users, TrendingUp, QrCode, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Order {
  id: string;
  customer: string;
  pages: number;
  type: 'bw' | 'color';
  amount: number;
  status: 'pending' | 'printed';
  time: string;
}

export default function OwnerDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([
    { id: "PQ-28471", customer: "Rahul Sharma", pages: 14, type: "bw", amount: 112, status: "printed", time: "10:42 AM" },
    { id: "PQ-28472", customer: "Priya Singh", pages: 5, type: "color", amount: 90, status: "pending", time: "11:05 AM" },
    { id: "PQ-28473", customer: "Amit Verma", pages: 28, type: "bw", amount: 224, status: "printed", time: "09:18 AM" },
  ]);

  const [shopSettings, setShopSettings] = useState({
    bwPrice: 8,
    colorPrice: 18,
    deliveryCharge: 25,
    autoPrint: true,
    colorInk: true,
    name: "Sharma Photocopy",
    location: "Bareilly, UP"
  });

  const [showQR, setShowQR] = useState(false);

  const login = () => {
    setIsLoggedIn(true);
    toast.success("Welcome back, Sharma Photocopy!");
  };

  const approveOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: 'printed' } : order
    ));
    toast.success("Order approved & printed!");
  };

  const printOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: 'printed' } : order
    ));
    toast.success("Printing started...");
  };

  const updatePrice = (type: 'bw' | 'color', value: number) => {
    setShopSettings(prev => ({
      ...prev,
      [type === 'bw' ? 'bwPrice' : 'colorPrice']: value
    }));
    toast.success(`Price updated to ₹${value}`);
  };

  const toggleAutoPrint = () => {
    setShopSettings(prev => ({ ...prev, autoPrint: !prev.autoPrint }));
    toast.success(`Auto Print ${!shopSettings.autoPrint ? 'Enabled' : 'Disabled'}`);
  };

  const toggleColorInk = () => {
    setShopSettings(prev => ({ ...prev, colorInk: !prev.colorInk }));
    toast.success(`Colour ink ${!shopSettings.colorInk ? 'Enabled' : 'Disabled'}`);
  };

  const generateQR = () => {
    setShowQR(true);
  };

  const downloadQR = () => {
    toast.success("QR Code downloaded!");
    setShowQR(false);
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
  const totalPages = orders.reduce((sum, order) => sum + order.pages, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-3xl p-8 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-teal-700 rounded-2xl flex items-center justify-center">
              <Printer className="text-white w-8 h-8" />
            </div>
          </div>
          
          <div className="text-center">
            <div className="font-extrabold text-2xl">Sharma Photocopy</div>
            <div className="text-sm text-teal-600 mt-1">Owner Login</div>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <div className="text-xs font-bold mb-1 px-1">Mobile / Email</div>
              <input type="text" defaultValue="9876543210" className="w-full px-4 py-3 border border-slate-300 rounded-3xl text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold mb-1 px-1">Password</div>
              <input type="password" defaultValue="printqr2026" className="w-full px-4 py-3 border border-slate-300 rounded-3xl text-sm" />
            </div>
          </div>

          <button 
            onClick={login} 
            className="mt-6 w-full py-3.5 bg-teal-700 text-white font-extrabold rounded-3xl"
          >
            Login to Dashboard
          </button>
          
          <Link href="/" className="block text-center mt-5 text-xs text-teal-700">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-teal-800 text-white">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-teal-300"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
            <div>
              <div className="font-extrabold text-2xl">{shopSettings.name}</div>
              <div className="text-xs text-teal-300">{shopSettings.location} • Active</div>
            </div>
          </div>
          
          <div className="flex items-center gap-x-3">
            <div className="px-3 py-1 bg-teal-700 rounded-3xl text-xs flex items-center">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mr-1.5"></div>
              Printer Connected
            </div>
            <button onClick={() => setIsLoggedIn(false)} className="px-4 py-1.5 text-xs font-bold bg-teal-700 rounded-3xl flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="stat-card bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">आज का रेवेन्यू</div>
            <div className="font-extrabold text-3xl mt-1">₹{totalRevenue}</div>
            <div className="text-xs text-emerald-600 mt-1">+32%</div>
          </div>
          <div className="stat-card bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">कस्टमर आज</div>
            <div className="font-extrabold text-3xl mt-1">87</div>
          </div>
          <div className="stat-card bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">प्रिंटेड पेज</div>
            <div className="font-extrabold text-3xl mt-1">{totalPages}</div>
          </div>
          <div className="stat-card bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">7-Day Income</div>
            <div className="font-extrabold text-3xl mt-1">₹1.12L</div>
          </div>
          <div className="stat-card bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">Pending Orders</div>
            <div className="font-extrabold text-3xl mt-1">{pendingOrders}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Orders Table */}
          <div className="lg:col-span-8 bg-white border rounded-3xl p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="font-extrabold text-xl">Recent Orders</div>
              <button className="text-xs px-4 py-1.5 bg-teal-100 text-teal-700 font-bold rounded-3xl">Refresh</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-teal-700 font-medium border-b">
                    <th className="text-left pb-3">Order</th>
                    <th className="text-left pb-3">Customer</th>
                    <th className="text-center pb-3">Pages</th>
                    <th className="text-center pb-3">Amount</th>
                    <th className="text-center pb-3">Status</th>
                    <th className="text-center pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b order-row">
                      <td className="py-4 font-extrabold text-sm">{order.id}</td>
                      <td className="py-4">{order.customer}</td>
                      <td className="py-4 text-center font-medium">{order.pages}</td>
                      <td className="py-4 text-center font-extrabold">₹{order.amount}</td>
                      <td className="py-4 text-center">
                        {order.status === 'printed' ? (
                          <span className="px-3 py-px text-xs font-extrabold bg-emerald-100 text-emerald-700 rounded-2xl">Printed</span>
                        ) : (
                          <span className="px-3 py-px text-xs font-extrabold bg-amber-100 text-amber-700 rounded-2xl cursor-pointer" onClick={() => approveOrder(order.id)}>Approve</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        {order.status === 'pending' && (
                          <button onClick={() => printOrder(order.id)} className="text-teal-700">
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settings */}
          <div className="lg:col-span-4 bg-white border rounded-3xl p-6">
            <div className="font-extrabold mb-5 flex items-center gap-2"><Settings className="w-4 h-4" /> Quick Settings</div>
            
            <div className="space-y-6">
              {/* B&W Price */}
              <div>
                <div className="flex justify-between text-sm mb-1 px-1">
                  <div className="font-bold">B&amp;W Price</div>
                  <div className="font-extrabold">₹{shopSettings.bwPrice}</div>
                </div>
                <input 
                  type="range" min="4" max="15" step="1" value={shopSettings.bwPrice} 
                  onChange={(e) => updatePrice('bw', parseInt(e.target.value))} 
                  className="w-full accent-teal-700" 
                />
              </div>

              {/* Colour Price */}
              <div>
                <div className="flex justify-between text-sm mb-1 px-1">
                  <div className="font-bold">Colour Price</div>
                  <div className="font-extrabold">₹{shopSettings.colorPrice}</div>
                </div>
                <input 
                  type="range" min="10" max="30" step="1" value={shopSettings.colorPrice} 
                  onChange={(e) => updatePrice('color', parseInt(e.target.value))} 
                  className="w-full accent-teal-700" 
                />
              </div>

              {/* Auto Print */}
              <div className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-bold">Auto Print</div>
                  <div className="text-xs text-teal-600">Paytm payment पर</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={shopSettings.autoPrint} 
                    onChange={toggleAutoPrint} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
                </label>
              </div>

              {/* Colour Ink */}
              <div className="flex justify-between items-center text-sm">
                <div className="font-bold">Colour Ink</div>
                <div 
                  onClick={toggleColorInk}
                  className={`px-4 py-1 text-xs cursor-pointer font-extrabold rounded-3xl ${shopSettings.colorInk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                >
                  {shopSettings.colorInk ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t">
              <button 
                onClick={generateQR} 
                className="w-full flex justify-center items-center px-4 py-3 bg-teal-700 text-white font-extrabold rounded-3xl gap-2"
              >
                <QrCode className="w-4 h-4" /> QR Code Download
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="mt-6 bg-white border rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="font-extrabold">7-Day Revenue Trend</div>
            <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-3xl">₹1.12L</div>
          </div>
          <div className="h-40 bg-gradient-to-r from-teal-50 to-white rounded-2xl flex items-center justify-center text-teal-700 text-sm">
            Revenue chart will appear here (Chart.js integration)
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm mx-4">
            <div className="flex justify-between mb-5">
              <div>
                <div className="font-extrabold">QR Code</div>
                <div className="text-xs text-teal-700">{shopSettings.name}</div>
              </div>
              <button onClick={() => setShowQR(false)} className="text-xl">×</button>
            </div>
            
            <div className="flex justify-center my-5">
              <div className="qr-code w-48 h-48 rounded-3xl flex items-center justify-center">
                <div className="bg-white w-40 h-40 rounded-2xl flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-teal-700" />
                </div>
              </div>
            </div>
            
            <div className="text-center text-xs mb-5">Print this QR and place in your shop</div>
            
            <div className="flex gap-3">
              <button onClick={downloadQR} className="flex-1 py-3 bg-teal-700 text-white font-extrabold rounded-3xl">Download PNG</button>
              <button onClick={() => setShowQR(false)} className="flex-1 py-3 border font-extrabold rounded-3xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
