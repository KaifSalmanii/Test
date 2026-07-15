'use client';

import React, { useState } from 'react';
import { ArrowLeft, Shield, Users, TrendingUp, Ban, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Shop {
  id: number;
  name: string;
  location: string;
  revenue: number;
  status: 'active' | 'warning' | 'banned';
  customers: number;
}

interface Promotion {
  id: number;
  shop: string;
  type: string;
  impressions: number;
}

export default function AdminPanel() {
  const [shops, setShops] = useState<Shop[]>([
    { id: 1, name: "Sharma Photocopy", location: "Bareilly", revenue: 17240, status: "active", customers: 87 },
    { id: 2, name: "PrintHub", location: "Delhi", revenue: 28400, status: "active", customers: 142 },
    { id: 3, name: "Fast Copy", location: "Moradabad", revenue: 9300, status: "warning", customers: 53 },
  ]);

  const [promotions, setPromotions] = useState<Promotion[]>([
    { id: 1, shop: "Sharma Photocopy", type: "Banner", impressions: 4200 },
    { id: 2, shop: "PrintHub", type: "Slide", impressions: 9800 },
  ]);

  const [showAdModal, setShowAdModal] = useState(false);
  const [newPromo, setNewPromo] = useState({ shop: '', type: 'Banner', desc: '' });

  const banShop = (id: number) => {
    setShops(prev => prev.map(shop => 
      shop.id === id ? { ...shop, status: 'banned' } : shop
    ));
    toast.error("Shop has been banned");
  };

  const warnShop = (id: number) => {
    setShops(prev => prev.map(shop => 
      shop.id === id ? { ...shop, status: 'warning' } : shop
    ));
    toast.warning("Warning sent to shop");
  };

  const addPromotion = () => {
    if (!newPromo.shop) {
      toast.error("Please select a shop");
      return;
    }

    const promo: Promotion = {
      id: Date.now(),
      shop: newPromo.shop,
      type: newPromo.type,
      impressions: Math.floor(Math.random() * 8000) + 1500
    };

    setPromotions([...promotions, promo]);
    setShowAdModal(false);
    setNewPromo({ shop: '', type: 'Banner', desc: '' });
    toast.success("Promotion added successfully!");
  };

  const totalShops = shops.length;
  const totalRevenue = shops.reduce((sum, s) => sum + s.revenue, 0);
  const activeShops = shops.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-teal-700"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
            <div className="font-extrabold text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-700" /> Admin Panel
            </div>
          </div>
          <div className="text-sm px-3 py-1 bg-teal-100 text-teal-700 rounded-3xl">Platform Admin</div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">Total Shops</div>
            <div className="font-extrabold text-4xl mt-1">{totalShops}</div>
          </div>
          <div className="bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">Total Customers</div>
            <div className="font-extrabold text-4xl mt-1">4.8m</div>
          </div>
          <div className="bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">Today's Revenue</div>
            <div className="font-extrabold text-4xl mt-1">₹8.4L</div>
          </div>
          <div className="bg-white border px-5 py-4 rounded-3xl">
            <div className="text-xs text-teal-600 font-medium">Active Shops</div>
            <div className="font-extrabold text-4xl mt-1">{activeShops}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Shops Management */}
          <div className="lg:col-span-7 bg-white border rounded-3xl p-6">
            <div className="font-extrabold text-xl mb-5">Shops Management</div>
            
            <div className="space-y-3">
              {shops.map((shop) => (
                <div key={shop.id} className="flex items-center justify-between px-5 py-4 border border-slate-200 rounded-3xl">
                  <div>
                    <div className="font-bold">{shop.name}</div>
                    <div className="text-xs text-teal-600">{shop.location} • {shop.customers} customers</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-extrabold">₹{shop.revenue}</div>
                      <div className="text-xs text-emerald-600">+18%</div>
                    </div>
                    
                    <div className={`px-3 py-1 text-xs font-bold rounded-3xl ${
                      shop.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                      shop.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {shop.status}
                    </div>
                    
                    <div className="flex gap-1">
                      {shop.status !== 'banned' && (
                        <>
                          <button onClick={() => warnShop(shop.id)} className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-3xl">Warn</button>
                          <button onClick={() => banShop(shop.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-3xl">Ban</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promotions */}
          <div className="lg:col-span-5 bg-white border rounded-3xl p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="font-extrabold text-xl">Promotions &amp; Ads</div>
              <button onClick={() => setShowAdModal(true)} className="flex items-center gap-1 text-xs px-4 py-1.5 bg-teal-700 text-white rounded-3xl">
                <Plus className="w-3 h-3" /> Add Ad
              </button>
            </div>
            
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="flex justify-between px-4 py-3 bg-slate-50 rounded-2xl">
                  <div>
                    <div className="font-semibold text-sm">{promo.shop}</div>
                    <div className="text-xs text-emerald-700">{promo.type} • {promo.impressions} impressions</div>
                  </div>
                  <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 font-extrabold h-fit rounded-3xl">Live</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-xs text-teal-700 px-1">
              Ads are displayed as banners/slides on customer pages.
            </div>
          </div>
        </div>

        {/* Platform Controls */}
        <div className="mt-6 bg-white border rounded-3xl p-6">
          <div className="font-extrabold mb-4">Platform Controls</div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="px-4 py-4 border rounded-3xl">
              <div className="font-bold">Send Global Notice</div>
              <input type="text" placeholder="Message for all shops..." className="mt-2 w-full px-4 py-2 text-xs border rounded-3xl" />
              <button className="mt-2 text-xs px-4 py-1 bg-teal-700 text-white rounded-3xl">Broadcast</button>
            </div>
            <div className="px-4 py-4 border rounded-3xl">
              <div className="font-bold">Platform Revenue</div>
              <div className="font-extrabold text-3xl mt-1">₹8.4L</div>
              <div className="text-xs text-emerald-600">Today</div>
            </div>
            <div className="px-4 py-4 border rounded-3xl flex flex-col justify-between">
              <div>
                <div className="font-bold">New Shop Requests</div>
                <div className="text-xs mt-1">12 pending approval</div>
              </div>
              <button className="text-xs px-4 py-1 bg-teal-700 text-white w-fit rounded-3xl">Review Requests</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Promotion Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm mx-4">
            <div className="font-extrabold mb-4">नया प्रमोशन जोड़ें</div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold mb-1">Shop Name</div>
                <select 
                  value={newPromo.shop} 
                  onChange={(e) => setNewPromo({...newPromo, shop: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-3xl text-sm"
                >
                  <option value="">Select Shop</option>
                  {shops.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              
              <div>
                <div className="text-xs font-bold mb-1">Ad Type</div>
                <div className="flex gap-2">
                  <div onClick={() => setNewPromo({...newPromo, type: 'Banner'})} className={`flex-1 text-center py-2 text-sm border rounded-3xl cursor-pointer ${newPromo.type === 'Banner' ? 'bg-teal-700 text-white' : ''}`}>Banner</div>
                  <div onClick={() => setNewPromo({...newPromo, type: 'Slide'})} className={`flex-1 text-center py-2 text-sm border rounded-3xl cursor-pointer ${newPromo.type === 'Slide' ? 'bg-teal-700 text-white' : ''}`}>Slide</div>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-bold mb-1">Description</div>
                <textarea 
                  value={newPromo.desc}
                  onChange={(e) => setNewPromo({...newPromo, desc: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-3xl h-20 text-sm" 
                  placeholder="20% off on first 100 prints..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdModal(false)} className="flex-1 py-3 text-sm border font-extrabold rounded-3xl">Cancel</button>
              <button onClick={addPromotion} className="flex-1 py-3 text-sm bg-teal-700 text-white font-extrabold rounded-3xl">Add Promotion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
