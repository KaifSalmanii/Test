'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Store, Shield, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navbar */}
      <nav className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="w-11 h-11 bg-teal-700 flex items-center justify-center rounded-2xl">
              <QrCode className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-3xl tracking-tighter text-teal-800">PrintQR</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-x-8 text-sm font-medium">
            <a href="#how" className="hover:text-teal-700 transition-colors">कैसे काम करता है</a>
            <a href="#features" className="hover:text-teal-700 transition-colors">फीचर्स</a>
            <Link href="/owner" className="hover:text-teal-700 transition-colors">दुकानदार</Link>
          </div>

          <div className="flex items-center gap-x-3">
            <Link 
              href="/customer" 
              className="px-5 py-2.5 text-sm font-semibold flex items-center gap-x-2 bg-teal-700 text-white rounded-3xl hover:bg-teal-800 transition-all"
            >
              <QrCode className="w-4 h-4" />
              QR स्कैन करें
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center px-4 py-1.5 rounded-3xl bg-teal-100 text-teal-700 mb-6 text-xs font-bold tracking-wider">
              <span>भारत के 12,000+ दुकानों द्वारा इस्तेमाल</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-teal-900 leading-[1.05]">
              स्कैन करो.<br />अपलोड करो.<br />
              <span className="text-teal-700">प्रिंट हो जाए.</span>
            </h1>

            <p className="mt-6 max-w-md text-xl text-slate-600">
              अब ग्राहक फाइल भेजने का झंझट नहीं। QR स्कैन करके खुद प्रिंट करवाएं।
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
              <Link 
                href="/customer"
                className="px-8 py-4 flex items-center justify-center bg-teal-700 hover:bg-teal-800 transition-all text-white font-bold rounded-3xl text-base w-full sm:w-auto modern-btn"
              >
                <QrCode className="mr-3 w-5 h-5" /> QR स्कैन करके आज़माएं
              </Link>
              <Link 
                href="/owner" 
                className="px-7 py-4 flex items-center justify-center text-teal-700 font-semibold bg-white border border-teal-200 hover:bg-teal-50 transition-all rounded-3xl text-base w-full sm:w-auto"
              >
                दुकानदार डैशबोर्ड देखें
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-x-4 text-sm">
              <div className="flex -space-x-2">
                {[28, 32, 47].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden ring-1 ring-teal-100">
                    <img src={`https://i.pravatar.cc/32?img=${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <span className="font-bold text-teal-700">4.9</span> <span className="text-slate-500">/ 5 • 8.4k रिव्यू</span>
              </div>
            </div>
          </div>

          {/* Hero QR Visual */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative">
              <div className="w-72 h-72 bg-white shadow-2xl border border-teal-100 rounded-3xl p-5 flex items-center justify-center">
                <div className="qr-code w-56 h-56 rounded-3xl flex items-center justify-center relative">
                  <div className="bg-white w-[185px] h-[185px] rounded-2xl flex flex-col items-center justify-center p-4">
                    <div className="w-40 h-40 bg-teal-900 rounded-xl flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-white" />
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-teal-700 text-xs font-black tracking-[1.5px]">SCAN TO PRINT</div>
                      <div className="text-[10px] text-teal-800 font-bold">SHARMA PHOTOCOPY</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 bg-white shadow-xl px-4 py-2.5 rounded-2xl border flex items-center gap-3">
                <div>
                  <div className="text-xs font-medium text-teal-600">आज के प्रिंट</div>
                  <div className="font-extrabold text-xl">1,284</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div id="how" className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="text-center mb-9">
          <span className="px-3 py-1 text-xs font-bold bg-teal-100 text-teal-700 rounded-3xl">SIMPLE 4-STEP PROCESS</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-teal-900">कैसे काम करता है?</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: QrCode, title: "1. QR स्कैन करें", desc: "दुकान में लगे QR को अपने मोबाइल से स्कैन करें" },
            { icon: Users, title: "2. फाइल अपलोड करें", desc: "PDF, JPG, PNG चुनें। पेज चुनें या क्रॉप करें" },
            { icon: Store, title: "3. पेमेंट करें", desc: "Paytm, UPI, QR या कैश। ऑटो/मैनुअल अप्रूवल" },
            { icon: Shield, title: "4. प्रिंट हो जाए!", desc: "30 सेकंड में प्रिंट तैयार। रसीद डाउनलोड करें" }
          ].map((step, index) => (
            <div key={index} className="print-card bg-white p-6 rounded-3xl border border-slate-200">
              <div className="w-11 h-11 bg-teal-100 rounded-2xl flex items-center justify-center mb-5">
                <step.icon className="text-teal-700 w-6 h-6" />
              </div>
              <div className="font-bold text-xl">{step.title}</div>
              <div className="text-sm text-slate-600 mt-1.5">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Selection Cards */}
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight">अपना रोल चुनें</h2>
          <p className="text-teal-700 mt-2">तीन अलग-अलग इंटरफेस उपलब्ध हैं</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Customer Card */}
          <Link href="/customer" className="group block">
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-8 transition-all group-hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6">
                <QrCode className="text-teal-700 w-7 h-7" />
              </div>
              <div className="font-extrabold text-2xl">ग्राहक</div>
              <div className="text-slate-600 mt-1">QR स्कैन करके प्रिंट करवाएं</div>
              <div className="mt-6 flex items-center text-teal-700 font-semibold text-sm">
                शुरू करें <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Link>

          {/* Owner Card */}
          <Link href="/owner" className="group block">
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-8 transition-all group-hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6">
                <Store className="text-teal-700 w-7 h-7" />
              </div>
              <div className="font-extrabold text-2xl">दुकानदार</div>
              <div className="text-slate-600 mt-1">डैशबोर्ड, ऑर्डर्स, प्राइसिंग और एनालिटिक्स</div>
              <div className="mt-6 flex items-center text-teal-700 font-semibold text-sm">
                डैशबोर्ड खोलें <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin" className="group block">
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-8 transition-all group-hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="text-teal-700 w-7 h-7" />
              </div>
              <div className="font-extrabold text-2xl">एडमिन</div>
              <div className="text-slate-600 mt-1">शॉप्स, प्रमोशन और प्लेटफॉर्म मैनेजमेंट</div>
              <div className="mt-6 flex items-center text-teal-700 font-semibold text-sm">
                एडमिन पैनल <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-screen-xl mx-auto px-6 pb-16">
        <div className="bg-teal-800 text-white rounded-3xl px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row gap-x-12 gap-y-4 items-center w-full">
            <div>
              <div className="text-teal-300 text-xs font-bold">TOTAL PRINTS TODAY</div>
              <div className="text-4xl font-extrabold">27,840</div>
            </div>
            <div className="hidden md:block h-9 w-px bg-teal-700"></div>
            <div>
              <div className="text-teal-300 text-xs font-bold">ACTIVE SHOPS</div>
              <div className="text-4xl font-extrabold">12,481</div>
            </div>
            <div className="hidden md:block h-9 w-px bg-teal-700"></div>
            <div>
              <div className="text-teal-300 text-xs font-bold">AVG. PRINT TIME</div>
              <div className="text-4xl font-extrabold">42s</div>
            </div>
          </div>
          <Link href="/owner" className="bg-white text-teal-800 px-6 py-3 text-sm font-extrabold rounded-3xl">
            दुकानदार बनें
          </Link>
        </div>
      </div>
    </div>
  );
}
