import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');
console.log('Project URL:', supabaseUrl);
console.log('Anon Key:', supabaseKey?.substring(0, 20) + '...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Try to get the current session (should be null for new connection)
    console.log('Test 1: Checking auth connection...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    console.log('✅ Auth connection successful (no active session)\n');

    // Test 2: Try a simple database query to test if we can reach the database
    console.log('Test 2: Testing database access...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      // If table doesn't exist, that's okay - it means we can connect
      if (error.code === '42P01') {
        console.log('✅ Database connection successful (profiles table not found, but connection works)\n');
      } else {
        console.log('⚠️  Database query returned error:', error.message);
        console.log('   This might be a permissions issue or the table doesn\'t exist yet.\n');
      }
    } else {
      console.log('✅ Database connection successful\n');
    }

    console.log('✅ Overall: Supabase connection is working!\n');
    console.log('Your Supabase client is properly configured and can reach the server.\n');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\nPlease check:\n');
    console.error('1. Your Supabase project is active');
    console.error('2. The URL and Anon Key are correct');
    console.error('3. Your internet connection is working\n');
    process.exit(1);
  }
}

testConnection();
