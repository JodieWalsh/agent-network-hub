import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔧 Applying migration: add_multiple_specializations...\n');

try {
  // Read the migration file
  const sql = readFileSync('./supabase/migrations/20260108000000_add_multiple_specializations.sql', 'utf8');

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);

    const { error } = await supabase.rpc('exec_sql', {
      sql: statement + ';'
    });

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n⚠️  Trying alternative method...\n');

      // If RPC fails, we'll need to run this manually in Supabase dashboard
      console.log('Please run this SQL manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw/sql/new\n');
      console.log(sql);
      process.exit(1);
    }
  }

  console.log('\n✅ Migration applied successfully!\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw/sql/new\n');

  const sql = readFileSync('./supabase/migrations/20260108000000_add_multiple_specializations.sql', 'utf8');
  console.log(sql);
  process.exit(1);
}
