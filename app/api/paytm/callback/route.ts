import { NextRequest, NextResponse } from 'next/server';
import PaytmChecksum from 'paytmchecksum';

const PAYTM_MKEY = process.env.PAYTM_MERCHANT_KEY || 'YOUR_KEY_HERE';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paytmParams: any = {};
    
    formData.forEach((value, key) => {
      paytmParams[key] = value;
    });

    // Verify checksum
    const isValidChecksum = PaytmChecksum.verifySignature(
      paytmParams, 
      PAYTM_MKEY, 
      paytmParams.CHECKSUMHASH
    );

    if (!isValidChecksum) {
      return NextResponse.redirect(
        new URL(`/customer?payment=failed&reason=checksum`, request.url)
      );
    }

    const orderId = paytmParams.ORDERID;
    const status = paytmParams.STATUS; // TXN_SUCCESS or TXN_FAILURE

    if (status === 'TXN_SUCCESS') {
      // Payment successful - redirect to success page
      return NextResponse.redirect(
        new URL(`/customer?payment=success&orderId=${orderId}`, request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/customer?payment=failed&reason=${paytmParams.RESPMSG}`, request.url)
      );
    }

  } catch (error) {
    console.error('Paytm Callback Error:', error);
    return NextResponse.redirect(
      new URL(`/customer?payment=failed&reason=server_error`, request.url)
    );
  }
}
