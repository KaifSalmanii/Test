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
      
      const { data: shop } = await supabase.from('shops').select('rates, settings').eq('id', shop_id).single();
      const rates = shop?.rates || {};
      const settings = shop?.settings || {};
      
      let subtotal = 0;
      const orderItems = items.map(item => {
        const rate = item.print_type === 'color' ? (rates.color_a4 || 10) : (rates.bw_a4 || 2);
        const sideMultiplier = item.sides === 'double' ? 0.5 : 1;
        const price = item.pages * item.copies * rate * sideMultiplier;
        subtotal += price;
        return { ...item, price };
      });
      
      const deliveryFee = delivery_type === 'delivery' ? (delivery_km || 0) * (rates.delivery_per_km || 5) : 0;
      const gstRate = settings.gst_rate || 18;
      const gst = subtotal * (gstRate / 100);
      const total = subtotal + deliveryFee + gst;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          shop_id,
          customer_name,
          customer_phone,
          customer_address,
          delivery_type,
          delivery_km,
          delivery_fee: deliveryFee,
          status: payment_method === 'auto_upi' ? 'printing' : 'pending',
          payment_method,
          payment_status: payment_method === 'auto_upi' ? 'paid' : 'pending',
          subtotal,
          gst,
          gst_rate: gstRate,
          total,
          notes
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
      if (itemsError) throw itemsError;
      
      return res.status(201).json({ ...order, items: orderItems });
    }
    
    if (req.method === 'PUT') {
      const { id, status, payment_status } = req.body;
      const updates = {};
      if (status) updates.status = status;
      if (payment_status) updates.payment_status = payment_status;
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      if (status === 'completed') {
        const { data: items } = await supabase.from('order_items').select('document_url').eq('order_id', id);
        if (items) {
          for (const item of items) {
            if (item.document_url) {
              const path = item.document_url.split('/documents/').pop();
              await supabase.storage.from('documents').remove([path]);
            }
          }
        }
      }
      
      return res.status(200).json(data);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}