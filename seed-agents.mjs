import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service_role key to bypass RLS for seeding
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseKey);

// Realistic buyer agents data with Australian cities
const buyerAgents = [
  {
    id: crypto.randomUUID(),
    full_name: "Sarah Mitchell",
    city: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    user_type: "buyers_agent",
    specializations: ["luxury", "residential"],
    reputation_score: 92,
    points: 850,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Luxury property specialist with 12+ years experience in Sydney's premium market. Helping clients secure their dream homes in the Eastern Suburbs and Lower North Shore.",
    service_regions: ["Sydney CBD", "Eastern Suburbs", "Lower North Shore"],
    home_base_address: "Double Bay, NSW 2028"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Marcus Chen",
    city: "Melbourne",
    latitude: -37.8136,
    longitude: 144.9631,
    user_type: "buyers_agent",
    specializations: ["investment", "commercial"],
    reputation_score: 88,
    points: 720,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Investment property expert focusing on high-yield opportunities across Melbourne's growth corridors. Strong track record in securing off-market deals.",
    service_regions: ["Melbourne CBD", "Inner West", "South East Melbourne"],
    home_base_address: "South Yarra, VIC 3141"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Emma Thompson",
    city: "Brisbane",
    latitude: -27.4698,
    longitude: 153.0251,
    user_type: "buyers_agent",
    specializations: ["residential"],
    reputation_score: 85,
    points: 640,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Family-focused buyers agent specializing in residential properties. Passionate about finding the perfect home for growing families in Brisbane's best suburbs.",
    service_regions: ["Brisbane CBD", "Inner North", "Bayside"],
    home_base_address: "New Farm, QLD 4005"
  },
  {
    id: crypto.randomUUID(),
    full_name: "David O'Sullivan",
    city: "Sydney",
    latitude: -33.7969,
    longitude: 151.2840,
    user_type: "buyers_agent",
    specializations: ["residential", "luxury"],
    reputation_score: 90,
    points: 780,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Northern Beaches specialist with deep local knowledge. 15 years helping buyers navigate Sydney's competitive property market with confidence.",
    service_regions: ["Northern Beaches", "North Shore", "Manly"],
    home_base_address: "Manly, NSW 2095"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Lisa Patel",
    city: "Perth",
    latitude: -31.9505,
    longitude: 115.8605,
    user_type: "buyers_agent",
    specializations: ["investment", "residential"],
    reputation_score: 87,
    points: 695,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Data-driven investment strategist with expertise in Perth's property market. Focusing on capital growth and rental yields for serious investors.",
    service_regions: ["Perth CBD", "Western Suburbs", "Coastal Perth"],
    home_base_address: "Subiaco, WA 6008"
  },
  {
    id: crypto.randomUUID(),
    full_name: "James Harrison",
    city: "Adelaide",
    latitude: -34.9285,
    longitude: 138.6007,
    user_type: "buyers_agent",
    specializations: ["commercial"],
    reputation_score: 83,
    points: 580,
    is_verified: false,
    role: "pending_professional",
    approval_status: "pending",
    application_date: new Date().toISOString(),
    bio: "Commercial property specialist with a focus on retail and office spaces. Strong negotiation skills and extensive market knowledge.",
    service_regions: ["Adelaide CBD", "Inner Adelaide", "Glenelg"],
    home_base_address: "Adelaide, SA 5000"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Rebecca Wong",
    city: "Melbourne",
    latitude: -37.8400,
    longitude: 144.9460,
    user_type: "buyers_agent",
    specializations: ["luxury", "investment", "residential"],
    reputation_score: 94,
    points: 920,
    is_verified: true,
    role: "verified_professional",
    approval_status: "approved",
    bio: "Award-winning luxury buyers agent specializing in prestige properties across Melbourne's most sought-after locations. White-glove service guaranteed.",
    service_regions: ["Toorak", "Brighton", "South Yarra", "Armadale"],
    home_base_address: "Toorak, VIC 3142"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Tom Bradley",
    city: "Gold Coast",
    latitude: -28.0167,
    longitude: 153.4000,
    user_type: "buyers_agent",
    specializations: ["residential"],
    reputation_score: 81,
    points: 530,
    is_verified: false,
    role: "pending_professional",
    approval_status: "pending",
    application_date: new Date().toISOString(),
    bio: "Gold Coast local with intimate knowledge of beachside living. Helping families and retirees find their perfect coastal lifestyle property.",
    service_regions: ["Surfers Paradise", "Broadbeach", "Burleigh Heads"],
    home_base_address: "Broadbeach, QLD 4218"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Natalie Foster",
    city: "Sydney",
    latitude: -33.8830,
    longitude: 151.2167,
    user_type: "buyers_agent",
    specializations: ["investment", "residential"],
    reputation_score: 89,
    points: 755,
    is_verified: false,
    role: "guest",
    approval_status: "approved",
    bio: "Strategic investor and buyers agent with a portfolio approach. Expertise in Sydney's emerging growth areas and renovation opportunities.",
    service_regions: ["Inner West", "Canterbury-Bankstown", "Parramatta"],
    home_base_address: "Newtown, NSW 2042"
  },
  {
    id: crypto.randomUUID(),
    full_name: "Andrew Richards",
    city: "Canberra",
    latitude: -35.2809,
    longitude: 149.1300,
    user_type: "buyers_agent",
    specializations: ["residential", "commercial"],
    reputation_score: 86,
    points: 670,
    is_verified: false,
    role: "guest",
    approval_status: "approved",
    bio: "Canberra property market specialist serving public servants and professionals. Excellent understanding of the ACT market dynamics.",
    service_regions: ["Canberra CBD", "North Canberra", "Belconnen"],
    home_base_address: "Civic, ACT 2601"
  }
];

async function seedAgents() {
  console.log('\n🌱 Seeding buyer agents to Supabase...\n');

  try {
    // Insert all agents
    const { data, error } = await supabase
      .from('profiles')
      .insert(buyerAgents)
      .select();

    if (error) {
      console.error('❌ Error inserting agents:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${data.length} buyer agents!\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   • Total agents: ${data.length}`);
    console.log(`   • Verified: ${data.filter(a => a.is_verified).length}`);
    console.log(`   • Cities: ${[...new Set(data.map(a => a.city))].join(', ')}`);
    console.log(`   • Specializations: ${[...new Set(data.map(a => a.specialization))].join(', ')}`);
    console.log(`   • Avg reputation: ${Math.round(data.reduce((sum, a) => sum + a.reputation_score, 0) / data.length)}\n`);

    console.log('🎉 Seed data created successfully!\n');
    console.log('👉 Visit http://localhost:8080/directory to see the agents\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedAgents();
