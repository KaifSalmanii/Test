import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fpzhuhbnqvsahochjxpo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_HZDtlXcJ4RqZ559QwD5V7w_N5WN4Nxe';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;