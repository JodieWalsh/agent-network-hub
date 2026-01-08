import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking profiles table schema...\n');

// Try to select with limit 0 to see available columns
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(0);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Query successful - table exists');
}

// Try a raw SQL query to check columns
const { data: columns, error: sqlError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `
});

if (sqlError) {
  console.log('\n⚠️  Could not query columns via RPC');
  console.log('Please check the schema manually in Supabase dashboard');
} else {
  console.log('\n📋 Profiles table columns:');
  console.log(columns);
}
