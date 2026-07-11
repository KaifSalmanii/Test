import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Printer, Upload, Camera, FileText, MapPin, Clock, Star, 
  ChevronRight, Check, X, Minus, Plus, Truck, Store, CreditCard, 
  Loader2, Trash2, RotateCw, ZoomIn, ZoomOut, ArrowLeft, RefreshCw,
  Copy, QrCode, Send
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_open: boolean;
  delivery_enabled: boolean;
  color_ink_available: boolean;
  rates: { bw_a4?: number; color_a4?: number; bw_a3?: number; color_a3?: number; delivery_per_km?: number; };
  settings: { gst_rate?: number; manual_upi_id?: string; merchant_id?: string; };
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
}

export default function CustomerShop() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<any[]>([]);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryKm, setDeliveryKm] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'auto_upi' | 'manual_upi' | 'cash'>('auto_upi');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (slug) fetchShop();
  }, [slug]);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!orderId) return;
    
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const fetchShop = async () => {
    try {
      const res = await fetch(`/api/shops?slug=${slug}`);
      if (!res.ok) throw new Error('Shop not found');
      const data = await res.json();
      setShop(data);
    } catch (err) {
      console.error('Failed to fetch shop:', err);
      setShop(null);
    } finally {
      setLoading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1920, height: 1080 } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setShowCamera(false);
    setShowCropper(true);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const applyCropAndSave = () => {
    if (!capturedImage) return;
    fetch(capturedImage).then(res => res.blob()).then(blob => {
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      addFile(file);
      setShowCropper(false);
      setCapturedImage(null);
      setRotation(0);
      setZoom(1);
    });
  };

  const cancelCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setShowCamera(false);
    setCapturedImage(null);
    setShowCropper(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    Array.from(selectedFiles).forEach(file => addFile(file));
  };

  const addFile = (file: File) => {
    const id = Math.random().toString(36).substr(2, 9);
    const isImage = file.type.startsWith('image/');
    setFiles(prev => [...prev, {
      id, name: file.name, file, preview: isImage ? URL.createObjectURL(file) : undefined,
      pages: 1, copies: 1, printType: 'bw', paperSize: 'A4', sides: 'single'
    }]);
  };

  const updateFile = (id: string, updates: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const calculatePrice = () => {
    if (!shop) return { subtotal: 0, deliveryFee: 0, gst: 0, total: 0 };
    const rates = shop.rates || {};
    let subtotal = 0;
    files.forEach(file => {
      const rate = file.printType === 'color' ? (rates.color_a4 || 10) : (rates.bw_a4 || 2);
      subtotal += file.pages * file.copies * rate * (file.sides === 'double' ? 0.5 : 1);
    });
    const deliveryFee = deliveryType === 'delivery' ? deliveryKm * (rates.delivery_per_km || 5) : 0;
    const gst = subtotal * ((shop.settings?.gst_rate || 18) / 100);
    return { subtotal, deliveryFee, gst, total: subtotal + deliveryFee + gst };
  };

  const handleSubmit = async () => {
    if (!shop || files.length === 0) return;
    setSubmitting(true);
    try {
      const uploadedItems = await Promise.all(files.map(async (file) => {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file.file);
        });
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileBase64: base64.split(',')[1], contentType: file.file.type, shop_id: shop.id })
        });
        const data = await res.json();
        return { document_url: data.url, document_name: file.name, pages: file.pages, copies: file.copies, print_type: file.printType, paper_size: file.paperSize, sides: file.sides };
      }));

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shop.id, customer_name: customerName, customer_phone: customerPhone,
          customer_address: deliveryType === 'delivery' ? customerAddress : null,
          delivery_type: deliveryType, delivery_km: deliveryKm, items: uploadedItems,
          payment_method: paymentMethod, notes
        })
      });
      const orderData = await orderRes.json();
      setOrderId(orderData.id);
      setOrder(orderData);
      setStep(4);
    } catch (err) {
      console.error('Order failed:', err);
      alert('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const sendUtrForVerification = async () => {
    if (!orderId || !utrNumber) return;
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, utr_number: utrNumber, status: 'pending_verification' })
      });
      alert('UTR sent for verification!');
    } catch (err) {
      alert('Failed to send UTR');
    }
  };

  const prices = calculatePrice();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Printer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Shop Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-black/50">
            <button onClick={cancelCamera} className="text-white p-2"><X className="w-6 h-6" /></button>
            <span className="text-white font-medium">Scan Document</span>
            <button onClick={capturePhoto} className="bg-white text-black px-4 py-2 rounded-lg font-medium">Capture</button>
          </div>
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ transform: `rotate(${rotation}deg)` }} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <button onClick={() => setRotation(r => (r + 90) % 360)} className="bg-white/20 backdrop-blur p-3 rounded-full"><RotateCw className="w-6 h-6 text-white" /></button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Crop Modal */}
      {showCropper && capturedImage && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-black/50">
            <button onClick={cancelCamera} className="text-white p-2"><ArrowLeft className="w-6 h-6" /></button>
            <span className="text-white font-medium">Adjust</span>
            <button onClick={applyCropAndSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Done</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }} />
          </div>
          <div className="p-4 flex items-center justify-center gap-6 bg-black/50">
            <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} className="bg-white/20 backdrop-blur p-3 rounded-full"><RotateCw className="w-5 h-5 text-white" /></button>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="bg-white/20 backdrop-blur p-3 rounded-full"><ZoomOut className="w-5 h-5 text-white" /></button>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="bg-white/20 backdrop-blur p-3 rounded-full"><ZoomIn className="w-5 h-5 text-white" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-xl" /> : <Printer className="w-6 h-6 text-white" />}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{shop.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className={`flex items-center gap-1 ${shop.is_open ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${shop.is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {shop.is_open ? 'Open' : 'Closed'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-current" /> 4.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                <p className="font-medium">Tap to upload files</p>
                <p className="text-sm text-gray-400">PDF, JPG, PNG, DOCX</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={handleFileSelect} className="hidden" />
              </div>
              <button onClick={startCamera} className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg">
                <Camera className="w-5 h-5" /> Scan Document with Camera
              </button>
              {files.length > 0 && (
                <div className="space-y-3">
                  {files.map(file => (
                    <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {file.preview ? <img src={file.preview} alt="" className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div className="flex-1"><p className="font-medium truncate">{file.name}</p><p className="text-sm text-gray-500">{file.pages} page × {file.copies} copy</p></div>
                      <button onClick={() => removeFile(file.id)} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {files.length > 0 && <button onClick={() => setStep(2)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium shadow-lg">Continue <ChevronRight className="w-5 h-5 inline" /></button>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {files.map(file => (
                <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                  <p className="font-medium truncate">{file.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => updateFile(file.id, { printType: 'bw' })} className={`py-3 rounded-xl font-medium ${file.printType === 'bw' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>B&W</button>
                    <button onClick={() => updateFile(file.id, { printType: 'color' })} disabled={!shop.color_ink_available} className={`py-3 rounded-xl font-medium ${file.printType === 'color' ? 'bg-indigo-600 text-white' : 'bg-gray-100'} ${!shop.color_ink_available ? 'opacity-50' : ''}`}>Color</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['A4', 'A3', 'Legal'].map(s => <button key={s} onClick={() => updateFile(file.id, { paperSize: s })} className={`py-2 rounded-xl text-sm font-medium ${file.paperSize === s ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>{s}</button>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => updateFile(file.id, { sides: 'single' })} className={`py-2 rounded-xl font-medium ${file.sides === 'single' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Single-sided</button>
                    <button onClick={() => updateFile(file.id, { sides: 'double' })} className={`py-2 rounded-xl font-medium ${file.sides === 'double' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Double-sided</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateFile(file.id, { copies: Math.max(1, file.copies - 1) })} className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Minus className="w-5 h-5" /></button>
                    <span className="text-lg font-semibold w-12 text-center">{file.copies}</span>
                    <button onClick={() => updateFile(file.id, { copies: file.copies + 1 })} className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 rounded-xl font-medium">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium">Continue</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="font-semibold">Your Details</h3>
                <input type="text" placeholder="Your Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
                <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="font-semibold">Delivery</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeliveryType('pickup')} className={`p-4 rounded-xl border-2 ${deliveryType === 'pickup' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}><Store className="w-6 h-6 mx-auto mb-1" /><span className="font-medium">Pick Up</span></button>
                  {shop.delivery_enabled && <button onClick={() => setDeliveryType('delivery')} className={`p-4 rounded-xl border-2 ${deliveryType === 'delivery' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}><Truck className="w-6 h-6 mx-auto mb-1" /><span className="font-medium">Delivery</span></button>}
                </div>
                {deliveryType === 'delivery' && (
                  <div className="space-y-3">
                    <textarea placeholder="Delivery Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" rows={2} />
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <input type="number" placeholder="Distance (km)" value={deliveryKm || ''} onChange={e => setDeliveryKm(parseFloat(e.target.value) || 0)} className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl" />
                      <span className="text-sm">× ₹{shop.rates?.delivery_per_km || 5}/km</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="font-semibold">Payment</h3>
                <div className="space-y-2">
                  <button onClick={() => setPaymentMethod('auto_upi')} className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 ${paymentMethod === 'auto_upi' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                    <CreditCard className="w-5 h-5" />
                    <div><p className="font-medium">Pay Now (UPI)</p><p className="text-xs text-gray-500">Instant print start</p></div>
                  </button>
                  {shop.settings?.manual_upi_id && (
                    <button onClick={() => setPaymentMethod('manual_upi')} className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 ${paymentMethod === 'manual_upi' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                      <QrCode className="w-5 h-5" />
                      <div><p className="font-medium">UPI: {shop.settings.manual_upi_id}</p><p className="text-xs text-gray-500">Pay & enter UTR for verification</p></div>
                    </button>
                  )}
                  <button onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                    <Store className="w-5 h-5" />
                    <div><p className="font-medium">Pay at Shop</p><p className="text-xs text-gray-500">Cash payment</p></div>
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{prices.subtotal.toFixed(2)}</span></div>
                  {deliveryType === 'delivery' && <div className="flex justify-between"><span>Delivery</span><span>₹{prices.deliveryFee.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span>GST ({shop.settings?.gst_rate || 18}%)</span><span>₹{prices.gst.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span>₹{prices.total.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 rounded-xl font-medium">Back</button>
                <button onClick={handleSubmit} disabled={submitting || !customerName || !customerPhone} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Place Order • ₹${prices.total.toFixed(2)}`}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && order && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
              <p className="text-gray-500 mb-4">Order ID: #{order.id.slice(-8).toUpperCase()}</p>
              
              {/* Live Status */}
              <div className="bg-white rounded-xl p-4 shadow-sm mb-4 max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'printing' ? 'bg-indigo-100 text-indigo-700' :
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status === 'printing' ? '🖨️ Printing...' :
                     order.status === 'completed' ? '✅ Completed' :
                     order.status === 'pending_verification' ? '⏳ Verifying Payment' :
                     '⏳ Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* UTR Input for Manual UPI */}
              {paymentMethod === 'manual_upi' && order.status === 'pending' && (
                <div className="bg-yellow-50 rounded-xl p-4 mb-4 max-w-xs mx-auto">
                  <p className="text-sm text-yellow-800 mb-3">Pay ₹{order.total.toFixed(2)} to: <strong>{shop.settings?.manual_upi_id}</strong></p>
                  <input type="text" placeholder="Enter UTR Number" value={utrNumber} onChange={e => setUtrNumber(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2" />
                  <button onClick={sendUtrForVerification} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Send for Verification
                  </button>
                </div>
              )}

              {/* Auto-refresh indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Live updates enabled
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}