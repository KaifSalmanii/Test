import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Get user info from token
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token' });
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      
      // Check if user is shop owner or staff
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('*, shops(*)')
        .eq('user_id', user.id)
        .single();
      
      return res.status(200).json({
        user,
        shop: shop || staffRecord?.shops || null,
        role: shop ? 'owner' : (staffRecord ? 'staff' : null),
        permissions: staffRecord?.permissions || null
      });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}