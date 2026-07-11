import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, IndianRupee, Truck, Printer, CreditCard, Store, Loader2, Check } from 'lucide-react';

export default function Settings() {
  const { shop, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [bwA4, setBwA4] = useState('2');
  const [colorA4, setColorA4] = useState('10');
  const [gstRate, setGstRate] = useState('18');
  const [deliveryPerKm, setDeliveryPerKm] = useState('5');
  const [isOpen, setIsOpen] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [colorInkAvailable, setColorInkAvailable] = useState(true);
  const [manualUpiId, setManualUpiId] = useState('');

  useEffect(() => {
    if (shop) {
      setBwA4(String(shop.rates?.bw_a4 || 2));
      setColorA4(String(shop.rates?.color_a4 || 10));
      setGstRate(String(shop.settings?.gst_rate || 18));
      setDeliveryPerKm(String(shop.rates?.delivery_per_km || 5));
      setIsOpen(shop.is_open ?? true);
      setDeliveryEnabled(shop.delivery_enabled ?? true);
      setColorInkAvailable(shop.color_ink_available ?? true);
      setManualUpiId((shop.settings as any)?.manual_upi_id || '');
    }
  }, [shop]);

  const handleSave = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      await fetch('/api/shops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: shop.id,
          is_open: isOpen,
          delivery_enabled: deliveryEnabled,
          color_ink_available: colorInkAvailable,
          rates: {
            bw_a4: parseFloat(bwA4) || 2,
            color_a4: parseFloat(colorA4) || 10,
            delivery_per_km: parseFloat(deliveryPerKm) || 5
          },
          settings: {
            gst_rate: parseFloat(gstRate) || 18,
            manual_upi_id: manualUpiId
          }
        })
      });
      await refreshAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!shop) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-semibold">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Store className="w-5 h-5" /> Shop Status</h2>
          <div className="flex items-center justify-between"><span>Shop Open</span><button onClick={() => setIsOpen(!isOpen)} className={`w-12 h-6 rounded-full ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition ${isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>
          <div className="flex items-center justify-between"><span>Home Delivery</span><button onClick={() => setDeliveryEnabled(!deliveryEnabled)} className={`w-12 h-6 rounded-full ${deliveryEnabled ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition ${deliveryEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>
          <div className="flex items-center justify-between"><span>Color Ink Available</span><button onClick={() => setColorInkAvailable(!colorInkAvailable)} className={`w-12 h-6 rounded-full ${colorInkAvailable ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition ${colorInkAvailable ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><IndianRupee className="w-5 h-5" /> Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-500">B&W A4 (₹)</label><input type="number" value={bwA4} onChange={e => setBwA4(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm text-gray-500">Color A4 (₹)</label><input type="number" value={colorA4} onChange={e => setColorA4(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm text-gray-500">GST (%)</label><input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm text-gray-500">Delivery (₹/km)</label><input type="number" value={deliveryPerKm} onChange={e => setDeliveryPerKm(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment</h2>
          <div><label className="text-sm text-gray-500">UPI ID (for manual payment)</label><input type="text" value={manualUpiId} onChange={e => setManualUpiId(e.target.value)} placeholder="yourname@upi" className="w-full mt-1 px-3 py-2 border rounded-lg" /></div>
        </div>

        <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-2 flex justify-around">
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-gray-500"><Store className="w-5 h-5" /><span className="text-xs">Home</span></button>
          <button onClick={() => navigate('/orders')} className="flex flex-col items-center gap-1 text-gray-500"><Truck className="w-5 h-5" /><span className="text-xs">Orders</span></button>
          <button className="flex flex-col items-center gap-1 text-indigo-600"><Printer className="w-5 h-5" /><span className="text-xs font-medium">Settings</span></button>
        </div>
      </div>
    </div>
  );
}