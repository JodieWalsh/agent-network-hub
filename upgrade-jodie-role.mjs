import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function upgradeJodieRole() {
  console.log('\n🔧 Upgrading Jodie Ralph to verified_professional...\n');

  // Find Jodie Ralph's profile
  const { data: profiles, error: findError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('full_name', 'Jodie Ralph')
    .limit(1);

  if (findError) {
    console.error('❌ Error finding profile:', findError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ No profile found for Jodie Ralph');
    return;
  }

  const profile = profiles[0];
  console.log(`Found profile: ${profile.full_name}`);
  console.log(`Current role: ${profile.role}`);

  // Update role to verified_professional
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role: 'verified_professional',
      approval_status: 'approved',
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('❌ Error updating role:', updateError);
    return;
  }

  console.log('✅ Successfully upgraded to verified_professional!');
  console.log('\n📝 Changes made:');
  console.log('   - role: guest → verified_professional');
  console.log('   - approval_status: approved');
  console.log('\n💡 Sign out and sign back in to see the "Client Briefs" link in the sidebar!');
}

upgradeJodieRole();
