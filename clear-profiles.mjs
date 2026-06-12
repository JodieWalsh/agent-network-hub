import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🗑️  Clearing existing profiles...\n');

const { error } = await supabase
  .from('profiles')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000');

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Profiles cleared successfully!\n');
}
