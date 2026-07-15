import { NextRequest, NextResponse } from 'next/server';
import PaytmChecksum from 'paytmchecksum';

const PAYTM_MID = process.env.PAYTM_MERCHANT_ID || 'YOUR_MID_HERE';
const PAYTM_MKEY = process.env.PAYTM_MERCHANT_KEY || 'YOUR_KEY_HERE';
const PAYTM_ENV = process.env.PAYTM_ENVIRONMENT || 'TEST'; // TEST or PROD

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, orderId, customerName, customerPhone, shopName } = body;

    if (!amount || !orderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const paytmParams: any = {
      MID: PAYTM_MID,
      ORDER_ID: orderId,
      CUST_ID: customerPhone || `CUST_${Date.now()}`,
      TXN_AMOUNT: amount.toString(),
      CHANNEL_ID: 'WEB',
      WEBSITE: PAYTM_ENV === 'PROD' ? 'DEFAULT' : 'WEBSTAGING',
      INDUSTRY_TYPE_ID: 'Retail',
      CALLBACK_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/paytm/callback`,
      EMAIL: 'customer@example.com',
      MOBILE_NO: customerPhone || '9876543210',
    };

    // Generate checksum
    const checksum = await PaytmChecksum.generateSignature(paytmParams, PAYTM_MKEY);
    paytmParams.CHECKSUMHASH = checksum;

    // For TEST environment, use staging URL
    const paytmUrl = PAYTM_ENV === 'PROD' 
      ? 'https://securegw.paytm.in/theia/api/v1/initiateTransaction' 
      : 'https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction';

    return NextResponse.json({
      success: true,
      paytmParams,
      paytmUrl,
      orderId,
    });

  } catch (error: any) {
    console.error('Paytm Initiate Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to initiate payment' 
    }, { status: 500 });
  }
}
