import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { shop_id } = req.query;
      if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
      
      const { data, error } = await supabase
        .from('b2b_wallets')
        .select('*, wallet_transactions(*)')
        .eq('shop_id', shop_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    if (req.method === 'POST') {
      const { shop_id, customer_name, customer_phone, initial_balance } = req.body;
      const { data, error } = await supabase
        .from('b2b_wallets')
        .insert({ shop_id, customer_name, customer_phone, balance: initial_balance || 0 })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    
    if (req.method === 'PUT') {
      const { id, amount, type, notes } = req.body;
      
      const { data: wallet } = await supabase.from('b2b_wallets').select('balance').eq('id', id).single();
      const newBalance = type === 'credit' ? wallet.balance + amount : wallet.balance - amount;
      
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({ wallet_id: id, amount, type, notes });
      if (txError) throw txError;
      
      const { data, error } = await supabase
        .from('b2b_wallets')
        .update({ balance: newBalance })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}