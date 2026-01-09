import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

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
