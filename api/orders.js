import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { shop_id, status, id, customer_phone } = req.query;
      
      if (id) {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      
      let query = supabase.from('orders').select('*');
      if (shop_id) query = query.eq('shop_id', shop_id);
      if (status) query = query.eq('status', status);
      if (customer_phone) query = query.eq('customer_phone', customer_phone);
      
      query = query.order('created_at', { ascending: false }).limit(100);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      const { shop_id, customer_name, customer_phone, customer_address, delivery_type, delivery_km, items, payment_method, notes } = req.body;
      
      // Validate required fields
      if (!shop_id || !customer_name || !customer_phone || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get shop details
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('rates, settings')
        .eq('id', shop_id)
        .single();
      
      if (shopError || !shop) {
        return res.status(400).json({ error: 'Shop not found' });
      }
      
      const rates = shop.rates || {};
      const settings = shop.settings || {};
      
      // Calculate pricing
      let subtotal = 0;
      const orderItems = items.map(item => {
        const rate = item.print_type === 'color' 
          ? (item.paper_size === 'A3' ? (rates.color_a3 || 20) : (rates.color_a4 || 10))
          : (item.paper_size === 'A3' ? (rates.bw_a3 || 4) : (rates.bw_a4 || 2));
        const sideMultiplier = item.sides === 'double' ? 0.5 : 1;
        const price = (item.pages || 1) * (item.copies || 1) * rate * sideMultiplier;
        subtotal += price;
        return {
          document_url: item.document_url || null,
          document_name: item.document_name || 'document.pdf',
          pages: item.pages || 1,
          copies: item.copies || 1,
          print_type: item.print_type || 'bw',
          paper_size: item.paper_size || 'A4',
          sides: item.sides || 'single',
          price
        };
      });
      
      const deliveryFee = delivery_type === 'delivery' ? (delivery_km || 0) * (rates.delivery_per_km || 5) : 0;
      const gstRate = settings.gst_rate || 18;
      const gst = subtotal * (gstRate / 100);
      const total = subtotal + deliveryFee + gst;
      
      // Determine initial status based on payment method
      let initialStatus = 'pending';
      let initialPaymentStatus = 'pending';
      
      if (payment_method === 'auto_upi') {
        initialStatus = 'printing';
        initialPaymentStatus = 'paid';
      }
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          shop_id,
          customer_name,
          customer_phone,
          customer_address: customer_address || null,
          delivery_type: delivery_type || 'pickup',
          delivery_km: delivery_km || 0,
          delivery_fee: deliveryFee,
          status: initialStatus,
          payment_method: payment_method || 'cash',
          payment_status: initialPaymentStatus,
          subtotal,
          gst,
          gst_rate: gstRate,
          total,
          notes: notes || null
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Order insert error:', orderError);
        return res.status(500).json({ error: 'Failed to create order: ' + orderError.message });
      }
      
      // Create order items
      const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
      
      if (itemsError) {
        console.error('Items insert error:', itemsError);
        // Try to delete the order if items failed
        await supabase.from('orders').delete().eq('id', order.id);
        return res.status(500).json({ error: 'Failed to create order items: ' + itemsError.message });
      }
      
      return res.status(201).json({ ...order, items: orderItems });
    }
    
    if (req.method === 'PUT') {
      const { id, status, payment_status, utr_number, review_rating, review_text } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Order ID required' });
      }
      
      const updates = {};
      if (status) updates.status = status;
      if (payment_status) updates.payment_status = payment_status;
      if (utr_number) updates.utr_number = utr_number;
      if (review_rating !== undefined) updates.review_rating = review_rating;
      if (review_text) updates.review_text = review_text;
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      // Delete documents on completion
      if (status === 'completed') {
        const { data: items } = await supabase
          .from('order_items')
          .select('document_url')
          .eq('order_id', id);
        
        if (items) {
          for (const item of items) {
            if (item.document_url) {
n              try {
                const path = item.document_url.split('/documents/').pop();
                await supabase.storage.from('documents').remove([path]);
              } catch (e) {
                console.error('Failed to delete document:', e);
              }\n            }\n          }\n        }\n      }\n      \n      return res.status(200).json(data);\n    }\n    \n    res.status(405).json({ error: 'Method not allowed' });\n  } catch (err) {\n    console.error('API error:', err);\n    res.status(500).json({ error: err.message });\n  }\n}