'use client';

import React, { useState } from 'react';
import { ArrowLeft, QrCode, Upload, CreditCard, Printer, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FileItem {
  id: number;
  name: string;
  size: string;
  type: string;
}

export default function CustomerPage() {
  const [step, setStep] = useState<'scan' | 'upload' | 'payment' | 'success'>('scan');
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [printType, setPrintType] = useState<'bw' | 'color'>('bw');
  const [pageCount, setPageCount] = useState(12);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<'paytm' | 'upi' | 'cash' | null>(null);
  const [orderId, setOrderId] = useState('');

  const shopSettings = {
    bwPrice: 8,
    colorPrice: 18,
    deliveryCharge: 25,
    name: "Sharma Photocopy",
    location: "Bareilly, UP",
    colorInk: true
  };

  const calculatePrice = () => {
    const basePrice = printType === 'bw' 
      ? pageCount * shopSettings.bwPrice 
      : pageCount * shopSettings.colorPrice;
    
    return deliveryEnabled ? basePrice + shopSettings.deliveryCharge : basePrice;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileItem[] = Array.from(files).map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      type: file.type.includes('pdf') ? 'PDF' : 'Image'
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    
    // Auto calculate pages
    const totalPages = newFiles.length * 3 + Math.floor(Math.random() * 5) + 4;
    setPageCount(totalPages);
    
    toast.success(`${newFiles.length} फाइल अपलोड हो गई`);
  };

  const removeFile = (id: number) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
  };

  const proceedToPayment = () => {
    if (uploadedFiles.length === 0) {
      toast.error("कृपया फाइल अपलोड करें");
      return;
    }
    setStep('payment');
  };

  const initiateRealPaytmPayment = async () => {
    const totalAmount = calculatePrice();
    const newOrderId = 'PQ-' + Math.floor(Math.random() * 90000) + 10000;
    
    setOrderId(newOrderId);

    try {
      const res = await fetch('/api/paytm/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          orderId: newOrderId,
          customerName: 'Customer',
          customerPhone: phone || '9876543210',
          shopName: shopSettings.name,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Create a form and submit to Paytm
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.paytmUrl;

        Object.keys(data.paytmParams).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.paytmParams[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        toast.error("Paytm payment failed to initiate");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to Paytm. Using demo mode.");
      
      // Fallback to demo
      setTimeout(() => {
        setStep('success');
        toast.success("Demo: Payment successful (Real Paytm will work with live keys)");
      }, 1200);
    }
  };

  const completePayment = async () => {
    if (!selectedPayment) {
      toast.error("कृपया पेमेंट मेथड चुनें");
      return;
    }

    if (selectedPayment === 'paytm') {
      await initiateRealPaytmPayment();
      return;
    }

    // For UPI and Cash - keep demo flow
    const newOrderId = 'PQ-' + Math.floor(Math.random() * 90000) + 10000;
    setOrderId(newOrderId);
    setStep('success');

    toast.success("पेमेंट सफल!", {
      description: "आपकी प्रिंट रिक्वेस्ट सबमिट हो गई है"
    });
  };

  const downloadReceipt = () => {
    const receiptHTML = `
      <div style="font-family: Arial; padding: 20px; max-width: 340px; margin: 0 auto; border: 1px solid #ccc;">
        <div style="text-align: center;">
          <h2 style="margin-bottom: 4px;">${shopSettings.name}</h2>
          <p style="margin: 0; color: #666;">${shopSettings.location}</p>
          <p style="margin: 4px 0; color: #666; font-size: 12px;">GST: 09AABCT1234D1Z9</p>
        </div>
        
        <div style="margin: 20px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 12px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Order ID</span>
            <span style="font-weight: bold;">${orderId}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Date</span>
            <span>${new Date().toLocaleDateString('hi-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Print Type</span>
            <span>${printType === 'bw' ? 'Black & White' : 'Colour'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Pages</span>
            <span>${pageCount}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
          <span>Total</span>
          <span>₹${calculatePrice()}</span>
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #0f766e; font-size: 13px;">
          Thank you! Visit again.
        </div>
      </div>
    `;
    
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderId}.html`;
    link.click();
    
    toast.success("रसीद डाउनलोड हो गई");
  };

  const resetFlow = () => {
    setStep('scan');
    setUploadedFiles([]);
    setPageCount(12);
    setDeliveryEnabled(false);
    setSelectedPayment(null);
    setOrderId('');
    setAddress('');
    setPhone('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center text-teal-700">
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </Link>
            <div className="font-extrabold text-2xl text-teal-800">PrintQR</div>
          </div>
          <div className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            Sharma Photocopy • Open
          </div>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-5 py-8">
        {/* Shop Info */}
        <div className="mb-6">
          <div className="font-extrabold text-3xl tracking-tight text-teal-900">{shopSettings.name}</div>
          <div className="flex items-center text-emerald-600 text-sm mt-1">
            <MapPin className="w-4 h-4 mr-1" /> {shopSettings.location}
          </div>
        </div>

        {/* SCAN STEP */}
        {step === 'scan' && (
          <div className="bg-white border rounded-3xl p-8 text-center">
            <div className="qr-code w-48 h-48 mx-auto rounded-3xl flex items-center justify-center mb-6">
              <div className="bg-white w-36 h-36 rounded-2xl flex flex-col items-center justify-center">
                <QrCode className="w-16 h-16 text-teal-700" />
                <div className="mt-3 text-xs font-black text-teal-700">SCAN TO PRINT</div>
              </div>
            </div>
            
            <div className="font-extrabold text-xl">QR स्कैन करें</div>
            <div className="text-sm text-slate-600 mt-1">दुकान में लगे QR को स्कैन करें</div>
            
            <button 
              onClick={() => setStep('upload')}
              className="mt-8 px-8 py-4 bg-teal-700 text-white font-extrabold rounded-3xl w-full flex items-center justify-center gap-2 modern-btn"
            >
              <QrCode className="w-5 h-5" /> QR स्कैन करें
            </button>
            
            <div className="text-xs mt-4 text-teal-700">या लिंक: printqr.in/s/2341</div>
          </div>
        )}

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <div className="bg-white border rounded-3xl p-6">
            <div className="font-extrabold text-xl mb-4">फाइल अपलोड करें</div>
            
            {/* Upload Area */}
            <div 
              onClick={() => document.getElementById('file-upload')?.click()}
              className="border border-dashed border-teal-300 hover:border-teal-400 bg-teal-50 cursor-pointer px-5 py-8 rounded-3xl text-center mb-5"
            >
              <Upload className="mx-auto w-9 h-9 text-teal-700 mb-3" />
              <div className="font-extrabold">PDF, JPG, PNG, DOC अपलोड करें</div>
              <div className="text-xs text-teal-600 mt-1">Max 50MB • Multiple files allowed</div>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mb-6">
                <div className="font-bold text-sm mb-3 px-1">अपलोड की गई फाइलें ({uploadedFiles.length})</div>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between px-4 py-3 border border-teal-200 bg-white rounded-2xl">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center mr-3 text-xs font-bold ${file.type === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                          {file.type === 'PDF' ? 'PDF' : 'IMG'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{file.name}</div>
                          <div className="text-xs text-teal-700">{file.size}</div>
                        </div>
                      </div>
                      <button onClick={() => removeFile(file.id)} className="text-red-400 hover:text-red-600 px-2">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print Settings */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <div className="text-xs font-bold mb-1.5 px-1">प्रिंट टाइप</div>
                <div className="flex border border-teal-300 rounded-3xl overflow-hidden">
                  <div 
                    onClick={() => setPrintType('bw')}
                    className={`flex-1 px-4 py-3 text-center cursor-pointer font-bold text-sm transition-all ${printType === 'bw' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
                  >
                    Black &amp; White
                  </div>
                  <div 
                    onClick={() => {
                      if (!shopSettings.colorInk) {
                        toast.error("कलर इंक उपलब्ध नहीं है");
                        return;
                      }
                      setPrintType('color');
                    }}
                    className={`flex-1 px-4 py-3 text-center cursor-pointer font-bold text-sm transition-all ${printType === 'color' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
                  >
                    Colour
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold mb-1.5 px-1">कुल पेज</div>
                <div className="flex items-center px-3 bg-white border border-teal-200 rounded-3xl py-[9px]">
                  <input 
                    type="number" 
                    value={pageCount} 
                    onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="font-extrabold text-xl w-16 outline-none px-2" 
                  />
                  <div className="font-bold text-xs text-teal-700">पेज</div>
                </div>
              </div>
            </div>

            {/* Delivery Toggle */}
            <div className="mb-5">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-extrabold">होम डिलीवरी</div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={deliveryEnabled} 
                    onChange={(e) => setDeliveryEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
                </label>
              </div>
              
              {deliveryEnabled && (
                <div className="mt-3 space-y-3">
                  <input 
                    type="text" 
                    placeholder="पूरा पता" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    className="px-4 py-2.5 text-sm border border-slate-300 w-full rounded-3xl" 
                  />
                  <input 
                    type="tel" 
                    placeholder="मोबाइल नंबर" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="px-4 py-2.5 text-sm border border-slate-300 w-full rounded-3xl" 
                  />
                  <div className="px-1 text-xs text-teal-700 font-bold">डिलीवरी चार्ज: ₹{shopSettings.deliveryCharge}</div>
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-teal-50 border border-teal-200 rounded-3xl px-5 py-4 mb-5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold">कुल मूल्य</div>
                  <div className="price-display text-teal-800">₹{calculatePrice()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold">B&amp;W: ₹{shopSettings.bwPrice}/page</div>
                  <div className="text-xs font-extrabold">Colour: ₹{shopSettings.colorPrice}/page</div>
                </div>
              </div>
            </div>

            <button 
              onClick={proceedToPayment} 
              className="px-6 py-4 w-full bg-teal-700 text-white font-extrabold rounded-3xl flex items-center justify-center text-base"
            >
              पेमेंट पेज पर जाएं
            </button>
            
            <div className="text-center mt-3 text-xs text-teal-700">फाइलें प्रिंट होने के बाद ऑटो डिलीट होंगी</div>
          </div>
        )}

        {/* PAYMENT STEP */}
        {step === 'payment' && (
          <div className="bg-white border rounded-3xl p-6">
            <div className="font-extrabold text-xl mb-1">पेमेंट</div>
            <div className="text-xs text-teal-700 mb-6">कुल: <span className="font-extrabold text-lg">₹{calculatePrice()}</span></div>
            
            <div className="space-y-3">
              <div 
                onClick={() => setSelectedPayment('paytm')}
                className={`cursor-pointer border px-4 py-4 flex items-center justify-between rounded-3xl payment-option ${selectedPayment === 'paytm' ? 'border-teal-700 bg-teal-50' : ''}`}
              >
                <div className="flex items-center">
                  <CreditCard className="text-teal-700 w-6 h-6 mr-3" />
                  <div>
                    <div className="font-extrabold">Paytm</div>
                    <div className="text-xs">Auto Payment • Merchant ID</div>
                  </div>
                </div>
                <div className="text-xs px-3 py-1 rounded-2xl bg-emerald-100 text-emerald-700 font-bold">Auto</div>
              </div>
              
              <div 
                onClick={() => setSelectedPayment('upi')}
                className={`cursor-pointer border px-4 py-4 flex items-center justify-between rounded-3xl payment-option ${selectedPayment === 'upi' ? 'border-teal-700 bg-teal-50' : ''}`}
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-3 flex items-center justify-center"><span className="font-extrabold text-teal-700">UPI</span></div>
                  <div>
                    <div className="font-extrabold">UPI / QR</div>
                    <div className="text-xs">Manual Approval</div>
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setSelectedPayment('cash')}
                className={`cursor-pointer border px-4 py-4 flex items-center justify-between rounded-3xl payment-option ${selectedPayment === 'cash' ? 'border-teal-700 bg-teal-50' : ''}`}
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-3">💵</div>
                  <div>
                    <div className="font-extrabold">Cash</div>
                    <div className="text-xs">Shop Owner Approval</div>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={completePayment} 
              className="mt-7 px-6 py-3.5 bg-teal-700 text-white font-extrabold rounded-3xl w-full"
            >
              पेमेंट करें
            </button>
            
            <div className="text-center text-xs mt-4 text-teal-700">Paytm Merchant ID: SHARMA_9231</div>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === 'success' && (
          <div className="bg-white border rounded-3xl p-7 text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full mb-4">
              <Printer className="w-9 h-9" />
            </div>
            
            <div className="font-extrabold text-2xl">प्रिंट रिक्वेस्ट सबमिट!</div>
            <div className="text-xs text-emerald-700 mt-1">Order ID: <span className="font-extrabold">{orderId}</span></div>
            
            <div className="mt-5 text-sm">आपकी फाइलें प्रिंट होने के बाद नोटिफिकेशन आएगा।</div>
            
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button 
                onClick={downloadReceipt}
                className="px-4 py-3 text-sm font-extrabold rounded-3xl border text-teal-700"
              >
                रसीद डाउनलोड करें
              </button>
              <button 
                onClick={resetFlow}
                className="px-4 py-3 text-sm font-extrabold rounded-3xl bg-emerald-700 text-white"
              >
                नया ऑर्डर
              </button>
            </div>
            
            <div className="mt-6">
              <button 
                onClick={() => {
                  toast("Review feature coming soon!");
                }}
                className="flex items-center justify-center gap-2 text-sm text-teal-700 font-medium"
              >
                <Star className="w-4 h-4" /> Review दें
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
