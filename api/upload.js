import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { fileName, fileBase64, contentType, shop_id } = req.body;
      const buffer = Buffer.from(fileBase64, 'base64');
      const uniqueName = `${shop_id}/${Date.now()}_${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(uniqueName, buffer, { contentType, upsert: true });
      
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uniqueName);
      
      return res.status(200).json({ url: urlData.publicUrl, path: uniqueName });
    }
    
    if (req.method === 'DELETE') {
      const { path } = req.body;
      const { error } = await supabase.storage
        .from('documents')
        .remove([path]);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
}