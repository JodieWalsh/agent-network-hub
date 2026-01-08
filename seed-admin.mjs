import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service_role key to create admin user
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Admin user details
const ADMIN_EMAIL = 'support@the-empowered-patient.org';
const ADMIN_PASSWORD = 'AdminPassword123!'; // Change after first login!

async function createAdminUser() {
  console.log('\n🔐 Creating admin user...\n');

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Admin user already exists. Skipping...\n');
        return;
      }
      throw authError;
    }

    console.log(`✅ Auth user created: ${authData.user.id}\n`);

    // 2. Create profile with admin role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: 'Platform Administrator',
        user_type: 'buyers_agent', // Admin can be any user type
        role: 'admin',
        approval_status: 'approved',
        city: 'Sydney',
        latitude: -33.8688,
        longitude: 151.2093,
        is_verified: true,
        reputation_score: 100,
        points: 1000,
        bio: 'Platform administrator with full access to manage users, properties, and platform settings.',
        service_regions: ['All Regions'],
        home_base_address: 'Sydney, NSW 2000',
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      throw profileError;
    }

    console.log('✅ Admin profile created successfully!\n');
    console.log('📧 Admin Email:', ADMIN_EMAIL);
    console.log('🔑 Admin Password:', ADMIN_PASSWORD);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!\n');
    console.log('🎉 Admin user setup complete!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createAdminUser();
