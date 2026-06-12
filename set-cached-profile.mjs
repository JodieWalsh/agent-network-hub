import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCachedProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('full_name', 'Jodie Ralph')
    .single();

  if (data) {
    console.log('\n✅ Profile data for localStorage:');
    console.log('Copy this JSON and paste it into your browser console:\n');
    console.log(`localStorage.setItem('cached_profile', '${JSON.stringify(data)}');\n`);
    console.log('Then refresh the page.\n');
  }
}

getCachedProfile();
