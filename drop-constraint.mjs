import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔧 Dropping foreign key constraint from profiles table...\n');

try {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;'
  });

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  The RPC method might not exist. Let me try direct SQL execution...\n');

    // Alternative: Use Supabase REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;'
      })
    });

    if (!response.ok) {
      console.error('❌ Still failed. Please run this SQL manually in Supabase dashboard:');
      console.log('\nALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;\n');
      process.exit(1);
    }
  }

  console.log('✅ Successfully dropped foreign key constraint!\n');
  console.log('👉 Now running seed script...\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw/sql/new\n');
  console.log('ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;\n');
  process.exit(1);
}
