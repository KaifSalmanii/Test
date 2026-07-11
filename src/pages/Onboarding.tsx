import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  Printer, Store, IndianRupee, QrCode, Truck, Image, 
  CreditCard, Check, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';

export default function Onboarding() {
  const { user, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Basic Info
  const [shopName, setShopName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  
  // Step 2: Pricing
  const [bwA4Rate, setBwA4Rate] = useState('2');
  const [colorA4Rate, setColorA4Rate] = useState('10');
  const [bwA3Rate, setBwA3Rate] = useState('4');
  const [colorA3Rate, setColorA3Rate] = useState('20');
  const [gstRate, setGstRate] = useState('18');
  
  // Step 3: Delivery
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryRatePerKm, setDeliveryRatePerKm] = useState('5');
  
  // Step 4: Payment
  const [autoPaymentEnabled, setAutoPaymentEnabled] = useState(true);
  const [manualUpiId, setManualUpiId] = useState('');
  const [manualUpiQr, setManualUpiQr] = useState('');
  const [cashEnabled, setCashEnabled] = useState(true);
  
  // Step 5: Printer
  const [bwPrinterName, setBwPrinterName] = useState('Printer 1');
  const [colorPrinterName, setColorPrinterName] = useState('Printer 2');
  const [colorInkAvailable, setColorInkAvailable] = useState(true);





  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const shopData = {
        name: shopName,
        slug: shopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim() + '-' + Math.random().toString(36).substr(2, 6),
        owner_id: user?.id,
        address: pickupAddress,
        phone: shopPhone,
        is_open: true,
        is_active: true,
        delivery_enabled: deliveryEnabled,
        color_ink_available: colorInkAvailable,
        rates: {
          bw_a4: parseFloat(bwA4Rate) || 2,
          color_a4: parseFloat(colorA4Rate) || 10,
          bw_a3: parseFloat(bwA3Rate) || 4,
          color_a3: parseFloat(colorA3Rate) || 20,
          delivery_per_km: parseFloat(deliveryRatePerKm) || 5
        },
        settings: {
          gst_rate: parseFloat(gstRate) || 18,
          auto_payment_enabled: autoPaymentEnabled,
          manual_upi_id: manualUpiId,
          cash_enabled: cashEnabled,
          bw_printer: bwPrinterName,
          color_printer: colorPrinterName
        }
      };
      
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      });
      
      if (!res.ok) throw new Error('Failed to create shop');
      
      await refreshAuth();
      navigate('/dashboard');
    } catch (err) {
      setError('Shop creation failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Shop Info', icon: Store },
    { number: 2, title: 'Pricing', icon: IndianRupee },
    { number: 3, title: 'Delivery', icon: Truck },
    { number: 4, title: 'Payment', icon: CreditCard },
    { number: 5, title: 'Printer', icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">D.dot Print</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Setup your print shop</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= s.number 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
              }`}
              >
                {step > s.number ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-20 h-1 mx-2 rounded ${
                  step > s.number ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
        >
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shop Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g., Quick Print Center"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pickup Address</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Where customers will come to collect prints"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">This address will be shown to customers for pickup</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Print Pricing</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Set your per-page rates</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">B&W A4 (₹/page)</label>
                  <input
                    type="number"
                    value={bwA4Rate}
                    onChange={(e) => setBwA4Rate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color A4 (₹/page)</label>
                  <input
                    type="number"
                    value={colorA4Rate}
                    onChange={(e) => setColorA4Rate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">B&W A3 (₹/page)</label>
                  <input
                    type="number"
                    value={bwA3Rate}
                    onChange={(e) => setBwA3Rate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color A3 (₹/page)</label>
                  <input
                    type="number"
                    value={colorA3Rate}
                    onChange={(e) => setColorA3Rate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate (%)</label>
                <input
                  type="number"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">GST will be added to final bill</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Home Delivery</h2>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Home Delivery</p>
                  <p className="text-sm text-gray-500">Customers can get prints delivered</p>
                </div>
                <button
                  onClick={() => setDeliveryEnabled(!deliveryEnabled)}
                  className={`w-12 h-6 rounded-full transition ${
                    deliveryEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                    deliveryEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              {deliveryEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Charge (₹ per km)</label>
                  <input
                    type="number"
                    value={deliveryRatePerKm}
                    onChange={(e) => setDeliveryRatePerKm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Auto Payment (UPI Gateway)</p>
                    <p className="text-sm text-gray-500">Instant payment, auto-print starts</p>
                  </div>
                  <button
                    onClick={() => setAutoPaymentEnabled(!autoPaymentEnabled)}
                    className={`w-12 h-6 rounded-full transition ${
                      autoPaymentEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                      autoPaymentEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Manual UPI Payment</p>
                      <p className="text-sm text-gray-500">Customer sends screenshot, you approve</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Available</span>
                  </div>
                  <input
                    type="text"
                    value={manualUpiId}
                    onChange={(e) => setManualUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Cash Payment</p>
                    <p className="text-sm text-gray-500">Customer pays at shop, you approve</p>
                  </div>
                  <button
                    onClick={() => setCashEnabled(!cashEnabled)}
                    className={`w-12 h-6 rounded-full transition ${
                      cashEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                      cashEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Printer Setup</h2>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">B&W Printer Name</label>
                  <input
                    type="text"
                    value={bwPrinterName}
                    onChange={(e) => setBwPrinterName(e.target.value)}
                    placeholder="e.g., HP LaserJet"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color Printer Name</label>
                  <input
                    type="text"
                    value={colorPrinterName}
                    onChange={(e) => setColorPrinterName(e.target.value)}
                    placeholder="e.g., Canon Inkjet"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Color Ink Available</p>
                    <p className="text-sm text-gray-500">If OFF, color option hidden for customers</p>
                  </div>
                  <button
                    onClick={() => setColorInkAvailable(!colorInkAvailable)}
                    className={`w-12 h-6 rounded-full transition ${
                      colorInkAvailable ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                      colorInkAvailable ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Back
              </button>
            )}
            
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!shopName && step === 1}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !shopName}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {loading ? 'Creating...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}