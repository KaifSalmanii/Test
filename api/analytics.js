import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { shop_id, period } = req.query;
      
      if (shop_id) {
        // Shop analytics
        const { data: orders } = await supabase
          .from('orders')
          .select('total, subtotal, gst, delivery_fee, status, created_at')
          .eq('shop_id', shop_id)
          .order('created_at', { ascending: false });
        
        const { data: items } = await supabase
          .from('order_items')
          .select('pages, copies, print_type, paper_size')
          .eq('order_id', orders?.map(o => o.id) || []);
        
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const totalOrders = orders?.length || 0;
        const totalPages = items?.reduce((sum, i) => sum + (i.pages * i.copies), 0) || 0;
        const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
        
        return res.status(200).json({
          totalRevenue,
          totalOrders,
          totalPages,
          completedOrders,
          orders: orders?.slice(0, 50) || []
        });
      }
      
      // Platform-wide analytics
      const { data: shops } = await supabase.from('shops').select('id, is_active, is_open');
      const { data: orders } = await supabase.from('orders').select('total, status, created_at');
      const { data: items } = await supabase.from('order_items').select('pages, copies');
      
      const activeShops = shops?.filter(s => s.is_active).length || 0;
      const openShops = shops?.filter(s => s.is_open).length || 0;
      const gmv = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalPages = items?.reduce((sum, i) => sum + (i.pages * i.copies), 0) || 0;
      
      return res.status(200).json({
        activeShops,
        openShops,
        gmv,
        totalPages,
        totalOrders: orders?.length || 0
      });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}