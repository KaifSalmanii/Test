import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, Upload, Camera, FileText, MapPin, Phone, Clock, Star, 
  ChevronRight, Check, X, Minus, Plus, Truck, Store, CreditCard, 
  Loader2, Trash2, RotateCw, ZoomIn, ZoomOut, Crop, ArrowLeft
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_open: boolean;
  delivery_enabled: boolean;
  color_ink_available: boolean;
  rates: {
    bw_a4?: number;
    color_a4?: number;
    bw_a3?: number;
    color_a3?: number;
    delivery_per_km?: number;
  };
  settings: {
    gst_rate?: number;
    manual_upi_id?: string;
    open_time?: string;
    close_time?: string;
    phone?: string;
    address?: string;
  };
}

interface FileItem {
  id: string;
  name: string;
  file: File;
  preview?: string;
  pages: number;
  copies: number;
  printType: 'bw' | 'color';
  paperSize: 'A4' | 'A3' | 'Legal';
  sides: 'single' | 'double';
}

export default function CustomerShop() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryKm, setDeliveryKm] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'auto_upi' | 'manual_upi' | 'cash'>('auto_upi');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (slug) fetchShop();
  }, [slug]);

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied. Please allow camera permission.');
      console.error('Camera error:', err);
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
    
    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setShowCamera(false);
    setShowCropper(true);
    
    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const applyCropAndSave = () => {
    if (!capturedImage) return;
    
    // Create file from captured image
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        addFile(file);
        setShowCropper(false);
        setCapturedImage(null);
        setRotation(0);
        setZoom(1);
      });
  };

  const cancelCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
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
    const preview = isImage ? URL.createObjectURL(file) : undefined;
    
    setFiles(prev => [...prev, {
      id,
      name: file.name,
      file,
      preview,
      pages: 1,
      copies: 1,
      printType: 'bw',
      paperSize: 'A4',
      sides: 'single'
    }]);
  };

  const updateFile = (id: string, updates: Partial<FileItem>) => {
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
      const rate = file.printType === 'color' 
        ? (file.paperSize === 'A3' ? rates.color_a3 : rates.color_a4) || 10
        : (file.paperSize === 'A3' ? rates.bw_a3 : rates.bw_a4) || 2;
      const sideMultiplier = file.sides === 'double' ? 0.5 : 1;
      subtotal += file.pages * file.copies * rate * sideMultiplier;
    });
    const deliveryFee = deliveryType === 'delivery' ? deliveryKm * (rates.delivery_per_km || 5) : 0;
    const gstRate = shop.settings?.gst_rate || 18;
    const gst = subtotal * (gstRate / 100);
    const total = subtotal + deliveryFee + gst;
    return { subtotal, deliveryFee, gst, total };
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
          body: JSON.stringify({
            fileName: file.name,
            fileBase64: base64.split(',')[1],
            contentType: file.file.type,
            shop_id: shop.id
          })
        });
        const data = await res.json();
        return {
          document_url: data.url,
          document_name: file.name,
          pages: file.pages,
          copies: file.copies,
          print_type: file.printType,
          paper_size: file.paperSize,
          sides: file.sides
        };
      }));

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shop.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: deliveryType === 'delivery' ? customerAddress : null,
          delivery_type: deliveryType,
          delivery_km: deliveryKm,
          items: uploadedItems,
          payment_method: paymentMethod,
          notes
        })
      });
      
      const orderData = await orderRes.json();
      setOrderId(orderData.id);
      setStep(4);
    } catch (err) {
      console.error('Order failed:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const prices = calculatePrice();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <Printer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Shop Not Found</h1>
          <p className="text-gray-500 mt-2">This shop doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-black/50">
            <button onClick={cancelCamera} className="text-white p-2">
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-medium">Scan Document</span>
            <button onClick={capturePhoto} className="bg-white text-black px-4 py-2 rounded-lg font-medium">
              Capture
            </button>
          </div>
          <div className="flex-1 relative">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <button 
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="bg-white/20 backdrop-blur p-3 rounded-full"
              >
                <RotateCw className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Crop Modal */}
      {showCropper && capturedImage && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-black/50">
            <button onClick={cancelCamera} className="text-white p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="text-white font-medium">Adjust & Crop</span>
            <button onClick={applyCropAndSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">
              Done
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="max-w-full max-h-full object-contain"
              style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
            />
          </div>
          <div className="p-4 flex items-center justify-center gap-6 bg-black/50">
            <button 
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="bg-white/20 backdrop-blur p-3 rounded-full"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="bg-white/20 backdrop-blur p-3 rounded-full"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="bg-white/20 backdrop-blur p-3 rounded-full"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Printer className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 dark:text-white text-lg">{shop.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1 ${shop.is_open ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${shop.is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {shop.is_open ? 'Open' : 'Closed'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-3 h-3 fill-current" /> 4.8
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step > s ? 'bg-indigo-600 text-white' : step === s ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 rounded ${step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Upload</span>
            <span>Configure</span>
            <span>Checkout</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
              >
                <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">Tap to upload files</p>
                <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG, DOCX</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={handleFileSelect} className="hidden" />
              </div>

              <button 
                onClick={startCamera}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <Camera className="w-5 h-5" />
                Scan Document with Camera
              </button>

              {files.length > 0 && (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                          {file.preview ? (
                            <img src={file.preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-sm text-gray-500">{file.pages} page{file.pages > 1 ? 's' : ''} × {file.copies} copy</p>
                        </div>
                        <button onClick={() => removeFile(file.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <button onClick={() => setStep(2)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-lg">
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white truncate flex-1">{file.name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Print Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updateFile(file.id, { printType: 'bw' })} className={`py-3 px-4 rounded-xl font-medium transition ${file.printType === 'bw' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>B&W</button>
                      <button onClick={() => updateFile(file.id, { printType: 'color' })} disabled={!shop.color_ink_available} className={`py-3 px-4 rounded-xl font-medium transition ${file.printType === 'color' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} ${!shop.color_ink_available ? 'opacity-50 cursor-not-allowed' : ''}`}>Color {!shop.color_ink_available && '(Unavailable)'}</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Paper Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['A4', 'A3', 'Legal'].map((size) => (
                        <button key={size} onClick={() => updateFile(file.id, { paperSize: size as 'A4' | 'A3' | 'Legal' })} className={`py-2 px-3 rounded-xl font-medium transition text-sm ${file.paperSize === size ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{size}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Sides</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updateFile(file.id, { sides: 'single' })} className={`py-2 px-4 rounded-xl font-medium transition ${file.sides === 'single' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Single-sided</button>
                      <button onClick={() => updateFile(file.id, { sides: 'double' })} className={`py-2 px-4 rounded-xl font-medium transition ${file.sides === 'double' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Double-sided</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Copies</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateFile(file.id, { copies: Math.max(1, file.copies - 1) })} className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center"><Minus className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white w-12 text-center">{file.copies}</span>
                      <button onClick={() => updateFile(file.id, { copies: file.copies + 1 })} className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2">Continue <ChevronRight className="w-5 h-5" /></button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Your Details</h3>
                <input type="text" placeholder="Your Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Delivery</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeliveryType('pickup')} className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${deliveryType === 'pickup' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <Store className={`w-6 h-6 ${deliveryType === 'pickup' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${deliveryType === 'pickup' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>Pick Up</span>
                  </button>
                  {shop.delivery_enabled && (
                    <button onClick={() => setDeliveryType('delivery')} className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${deliveryType === 'delivery' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <Truck className={`w-6 h-6 ${deliveryType === 'delivery' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${deliveryType === 'delivery' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>Delivery</span>
                    </button>
                  )}
                </div>
                {deliveryType === 'delivery' && (
                  <div className="space-y-3">
                    <textarea placeholder="Delivery Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" rows={2} />
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <input type="number" placeholder="Distance (km)" value={deliveryKm || ''} onChange={(e) => setDeliveryKm(parseFloat(e.target.value) || 0)} className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                      <span className="text-sm text-gray-500">× ₹{shop.rates?.delivery_per_km || 5}/km</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Payment</h3>
                <div className="space-y-2">
                  <button onClick={() => setPaymentMethod('auto_upi')} className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${paymentMethod === 'auto_upi' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <CreditCard className={`w-5 h-5 ${paymentMethod === 'auto_upi' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <p className={`font-medium ${paymentMethod === 'auto_upi' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>Pay Now (UPI/Card)</p>
                      <p className="text-xs text-gray-500">Instant print start</p>
                    </div>
                  </button>
                  {shop.settings?.manual_upi_id && (
                    <button onClick={() => setPaymentMethod('manual_upi')} className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${paymentMethod === 'manual_upi' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <FileText className={`w-5 h-5 ${paymentMethod === 'manual_upi' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-medium ${paymentMethod === 'manual_upi' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>UPI: {shop.settings.manual_upi_id}</p>
                        <p className="text-xs text-gray-500">Send screenshot for approval</p>
                      </div>
                    </button>
                  )}
                  <button onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <Store className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <p className={`font-medium ${paymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>Pay at Shop</p>
                      <p className="text-xs text-gray-500">Cash payment</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal ({files.length} file{files.length > 1 ? 's' : ''})</span><span>₹{prices.subtotal.toFixed(2)}</span></div>
                  {deliveryType === 'delivery' && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Delivery</span><span>₹{prices.deliveryFee.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>GST ({shop.settings?.gst_rate || 18}%)</span><span>₹{prices.gst.toFixed(2)}</span></div>
                  <div className="border-t border-indigo-200 dark:border-indigo-700 pt-2 mt-2"><div className="flex justify-between font-semibold text-gray-900 dark:text-white"><span>Total</span><span className="text-lg">₹{prices.total.toFixed(2)}</span></div></div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Back</button>
                <button onClick={handleSubmit} disabled={submitting || !customerName || !customerPhone} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-400 disabled:to-purple-400 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-lg">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : <>Place Order • ₹{prices.total.toFixed(2)}</>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Placed!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Order ID: #{orderId?.slice(-8).toUpperCase()}</p>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-sm mb-3"><span className="text-gray-500 dark:text-gray-400">Status</span><span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">{paymentMethod === 'auto_upi' ? 'Printing' : 'Pending Approval'}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-semibold text-gray-900 dark:text-white">₹{prices.total.toFixed(2)}</span></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{deliveryType === 'pickup' ? "You'll be notified when your order is ready for pickup." : 'Your order will be delivered to your address.'}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}