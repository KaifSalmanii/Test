# PrintQR • Complete Production App

Full-featured Photocopy Shop Management Platform built with **Next.js 16 + TypeScript + Supabase**.

## ✅ Features Implemented

### Customer Flow
- QR Scan → File Upload (PDF/Image)
- Page selection + Colour/B&W toggle
- Home Delivery option
- Multiple Payment Methods (Paytm Auto, UPI, Cash)
- Receipt generation + Review prompt

### Shop Owner Dashboard
- Login & Multi-shop support
- Real-time order management
- Dynamic pricing (B&W & Colour)
- Auto Print toggle + Colour Ink control
- QR Code generator & download
- Revenue analytics

### Admin Panel
- Shop management (Ban / Warn)
- Promotion & Ad management
- Platform-wide analytics

### Technical
- Supabase ready (auth + database + storage)
- Fully responsive
- TypeScript + Tailwind
- Toast notifications
- Production build ready

---

## 🚀 Quick Start

```bash
cd printqr-app
npm install
npm run dev
```

Visit: `http://localhost:3000`

---

## 🔧 Supabase Setup (Real Backend)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your **Project URL** and **Anon Key**
4. Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Run the following SQL in Supabase SQL Editor:

```sql
-- Shops Table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID,
  name TEXT NOT NULL,
  location TEXT,
  bw_price INTEGER DEFAULT 8,
  color_price INTEGER DEFAULT 18,
  delivery_charge INTEGER DEFAULT 25,
  auto_print BOOLEAN DEFAULT true,
  color_ink BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id),
  customer_name TEXT,
  customer_phone TEXT,
  pages INTEGER,
  print_type TEXT,
  amount INTEGER,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'paid',
  delivery BOOLEAN DEFAULT false,
  delivery_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions Table
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id),
  type TEXT,
  description TEXT,
  impressions INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);
```

---

## 💳 Real Paytm Integration (LIVE)

**✅ Fully Integrated!**

### Steps to Enable Real Paytm:

1. **Create Paytm Merchant Account**
   - Go to [business.paytm.com](https://business.paytm.com)
   - Create a merchant account and get approved

2. **Get Credentials**
   - Merchant ID (MID)
   - Merchant Key

3. **Add to `.env.local`**:

```env
PAYTM_MERCHANT_ID=your_mid_here
PAYTM_MERCHANT_KEY=your_key_here
PAYTM_ENVIRONMENT=TEST     # Change to PROD for live
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

4. **How it works**:
   - When customer selects **Paytm**, it calls `/api/paytm/initiate`
   - Generates secure checksum
   - Submits real Paytm form
   - After payment → `/api/paytm/callback` verifies and redirects

### Test Mode
- Currently in **TEST** mode (works with Paytm test credentials)
- Real money is not deducted in TEST mode

### Production
- Change `PAYTM_ENVIRONMENT=PROD`
- Update `NEXT_PUBLIC_BASE_URL` to your live domain

**Note**: All other payment methods (UPI, Cash) still work as demo/manual.

---

## 📱 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy

### Local Production Build
```bash
npm run build
npm start
```

---

## 🛠 Future Enhancements (Ready to Add)

- Real-time orders with Supabase Realtime
- WhatsApp notifications
- File upload to Supabase Storage
- Mobile App (React Native / Expo)
- GST Invoice PDF generation

---

**Made for India** • GST Compliant • Secure • Scalable
