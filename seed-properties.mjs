import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyanRkdW5sanp4YXN5b2hqZG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA1MzY5NCwiZXhwIjoyMDgxNjI5Njk0fQ.tCQJ2JPxPTGOq0OuZRPl6nrULd2fDVeq_mPqJTw4d5M';

const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive property listings with ALL detailed attributes
const properties = [
  {
    id: crypto.randomUUID(),
    title: "Luxury Waterfront Masterpiece - Vaucluse",
    description: "Spectacular harbourfront estate with panoramic Sydney Harbour views. This architectural masterpiece combines timeless elegance with modern luxury across three levels of sophisticated living.",
    city: "Sydney",
    state: "NSW",
    price: 12500000,
    bedrooms: 5,
    bathrooms: 4,
    status: "off_market",
    latitude: -33.8570,
    longitude: 151.2774,

    // Size and basics
    land_size_sqm: 1250,
    building_size_sqm: 650,
    number_of_levels: 3,
    year_built: 2019,
    property_condition: "excellent",

    // Pool
    has_pool: true,
    pool_type: "infinity",
    pool_length_m: 15,
    pool_width_m: 4.5,

    // Garden and outdoor
    garden_type: "landscaped",
    garden_size_sqm: 400,
    outdoor_entertaining_area: true,
    outdoor_area_size_sqm: 120,
    balcony_terrace: true,

    // Architecture
    architectural_style: "contemporary",
    ceiling_height_m: 3.6,
    primary_light_direction: "north",
    natural_light_quality: "excellent",

    // Views
    has_water_views: true,
    has_city_views: true,
    has_mountain_views: false,
    has_park_views: false,
    view_quality: "panoramic",

    // Parking
    parking_spaces: 3,
    parking_type: "garage",
    has_garage: true,
    storage_area: true,
    storage_size_sqm: 25,

    // Climate
    air_conditioning: "ducted",
    heating_type: "ducted",
    solar_panels: true,
    solar_capacity_kw: 10,
    water_tank: false,

    // Security
    security_system: true,
    security_features: ["alarm", "cameras", "intercom", "gate", "smart_locks"],
    smart_home_features: ["automation", "smart_lights", "smart_blinds", "security_integration"],

    // Sustainability
    energy_efficiency_rating: 8.5,
    water_efficiency_rating: 5,
    sustainable_features: ["solar", "rainwater", "double_glazing", "led_lighting", "high_insulation"],

    // Kitchen
    kitchen_style: "gourmet",
    kitchen_features: ["island", "butler_pantry", "stone_benchtops", "gas_cooking", "dishwasher", "wine_fridge"],
    ensuite_bathrooms: 2,
    powder_rooms: 1,
    bathroom_features: ["spa_bath", "separate_shower", "double_vanity", "heated_floors", "underfloor_heating"],

    // Flooring
    flooring_types: ["timber", "marble", "tiles"],
    interior_condition: "pristine",

    // Location
    proximity_beach_km: 2.5,
    proximity_cbd_km: 7,
    proximity_schools_km: 1.2,
    proximity_shopping_km: 2,
    proximity_transport_km: 0.8,
    walkability_score: 85,

    // Investment
    rental_yield_estimate: 2.1,
    council_rates_annual: 8500,
    water_rates_annual: 1200,

    // Lifestyle
    noise_level: "quiet",
    street_traffic: "quiet_street",
    privacy_level: "very_private"
  },

  {
    id: crypto.randomUUID(),
    title: "Modern Family Haven - Toorak",
    description: "Impeccably renovated family home on a prized tree-lined street. Combining period charm with contemporary luxury, featuring soaring ceilings and premium finishes throughout.",
    city: "Melbourne",
    state: "VIC",
    price: 4850000,
    bedrooms: 4,
    bathrooms: 3,
    status: "off_market",
    latitude: -37.8400,
    longitude: 145.0100,

    land_size_sqm: 850,
    building_size_sqm: 420,
    number_of_levels: 2,
    year_built: 1925,
    property_condition: "excellent",

    has_pool: true,
    pool_type: "lap_pool",
    pool_length_m: 12,
    pool_width_m: 3,

    garden_type: "established",
    garden_size_sqm: 280,
    outdoor_entertaining_area: true,
    outdoor_area_size_sqm: 65,
    balcony_terrace: false,

    architectural_style: "federation",
    ceiling_height_m: 3.8,
    primary_light_direction: "north_east",
    natural_light_quality: "excellent",

    has_water_views: false,
    has_city_views: false,
    has_mountain_views: false,
    has_park_views: true,
    view_quality: "partial",

    parking_spaces: 2,
    parking_type: "garage",
    has_garage: true,
    storage_area: true,
    storage_size_sqm: 12,

    air_conditioning: "split_system",
    heating_type: "ducted",
    solar_panels: true,
    solar_capacity_kw: 6.6,
    water_tank: true,
    water_tank_capacity_l: 3000,

    security_system: true,
    security_features: ["alarm", "cameras", "intercom"],
    smart_home_features: ["smart_lights", "smart_thermostat"],

    energy_efficiency_rating: 7.5,
    water_efficiency_rating: 4,
    sustainable_features: ["solar", "rainwater", "insulation", "led_lighting"],

    kitchen_style: "modern",
    kitchen_features: ["island", "pantry", "stone_benchtops", "gas_cooking", "dishwasher"],
    ensuite_bathrooms: 1,
    powder_rooms: 1,
    bathroom_features: ["separate_shower", "double_vanity", "heated_floors"],

    flooring_types: ["timber", "tiles"],
    interior_condition: "excellent",

    proximity_beach_km: 12,
    proximity_cbd_km: 4.5,
    proximity_schools_km: 0.6,
    proximity_shopping_km: 1.2,
    proximity_transport_km: 0.4,
    walkability_score: 92,

    rental_yield_estimate: 2.3,
    council_rates_annual: 4200,
    water_rates_annual: 850,

    noise_level: "very_quiet",
    street_traffic: "quiet_street",
    privacy_level: "private"
  },

  {
    id: crypto.randomUUID(),
    title: "Coastal Retreat - Burleigh Heads",
    description: "Stunning beachside residence just moments from the pristine sands of Burleigh Beach. Designed for effortless indoor-outdoor living with ocean breezes and coastal charm.",
    city: "Gold Coast",
    state: "QLD",
    price: 2950000,
    bedrooms: 4,
    bathrooms: 3,
    status: "off_market",
    latitude: -28.0939,
    longitude: 153.4508,

    land_size_sqm: 620,
    building_size_sqm: 320,
    number_of_levels: 2,
    year_built: 2021,
    property_condition: "excellent",

    has_pool: true,
    pool_type: "plunge",
    pool_length_m: 6,
    pool_width_m: 3.5,

    garden_type: "low_maintenance",
    garden_size_sqm: 150,
    outdoor_entertaining_area: true,
    outdoor_area_size_sqm: 85,
    balcony_terrace: true,

    architectural_style: "hamptons",
    ceiling_height_m: 3.0,
    primary_light_direction: "north",
    natural_light_quality: "excellent",

    has_water_views: true,
    has_city_views: false,
    has_mountain_views: false,
    has_park_views: false,
    view_quality: "glimpses",

    parking_spaces: 2,
    parking_type: "garage",
    has_garage: true,
    storage_area: true,
    storage_size_sqm: 8,

    air_conditioning: "ducted",
    heating_type: "none",
    solar_panels: true,
    solar_capacity_kw: 8,
    water_tank: false,

    security_system: true,
    security_features: ["alarm", "cameras", "gate"],
    smart_home_features: ["smart_locks", "smart_lights"],

    energy_efficiency_rating: 8,
    water_efficiency_rating: 4.5,
    sustainable_features: ["solar", "double_glazing", "led_lighting", "ceiling_fans"],

    kitchen_style: "modern",
    kitchen_features: ["island", "pantry", "stone_benchtops", "gas_cooking", "dishwasher"],
    ensuite_bathrooms: 2,
    powder_rooms: 0,
    bathroom_features: ["separate_shower", "double_vanity"],

    flooring_types: ["tiles", "timber"],
    interior_condition: "pristine",

    proximity_beach_km: 0.3,
    proximity_cbd_km: 92,
    proximity_schools_km: 1.8,
    proximity_shopping_km: 0.9,
    proximity_transport_km: 0.5,
    walkability_score: 95,

    rental_yield_estimate: 3.2,
    council_rates_annual: 3100,
    water_rates_annual: 950,

    noise_level: "moderate",
    street_traffic: "moderate",
    privacy_level: "moderate"
  },

  {
    id: crypto.randomUUID(),
    title: "Urban Sanctuary - Surry Hills Penthouse",
    description: "Breathtaking top-floor penthouse with sweeping city skyline views. Industrial-chic design meets contemporary luxury in this light-filled urban oasis.",
    city: "Sydney",
    state: "NSW",
    price: 3200000,
    bedrooms: 3,
    bathrooms: 2,
    status: "off_market",
    latitude: -33.8886,
    longitude: 151.2094,

    land_size_sqm: null, // Apartment
    building_size_sqm: 185,
    number_of_levels: 1,
    year_built: 2018,
    property_condition: "excellent",

    has_pool: false,
    pool_type: "none",

    garden_type: "none",
    garden_size_sqm: null,
    outdoor_entertaining_area: true,
    outdoor_area_size_sqm: 45,
    balcony_terrace: true,

    architectural_style: "industrial",
    ceiling_height_m: 3.2,
    primary_light_direction: "north_west",
    natural_light_quality: "excellent",

    has_water_views: false,
    has_city_views: true,
    has_mountain_views: false,
    has_park_views: false,
    view_quality: "panoramic",

    parking_spaces: 2,
    parking_type: "garage",
    has_garage: true,
    storage_area: true,
    storage_size_sqm: 6,

    air_conditioning: "ducted",
    heating_type: "ducted",
    solar_panels: false,
    water_tank: false,

    security_system: true,
    security_features: ["intercom", "cameras", "secure_parking", "concierge"],
    smart_home_features: ["automation", "smart_lights", "smart_blinds"],

    energy_efficiency_rating: 7,
    water_efficiency_rating: 4,
    sustainable_features: ["double_glazing", "led_lighting", "insulation"],

    kitchen_style: "modern",
    kitchen_features: ["island", "stone_benchtops", "gas_cooking", "dishwasher", "wine_fridge"],
    ensuite_bathrooms: 1,
    powder_rooms: 0,
    bathroom_features: ["spa_bath", "separate_shower", "double_vanity"],

    flooring_types: ["concrete", "timber"],
    interior_condition: "excellent",

    proximity_beach_km: 4.5,
    proximity_cbd_km: 1.2,
    proximity_schools_km: 1.5,
    proximity_shopping_km: 0.3,
    proximity_transport_km: 0.2,
    walkability_score: 98,

    rental_yield_estimate: 3.8,
    council_rates_annual: 2800,
    strata_fees_quarterly: 1950,
    water_rates_annual: 750,

    noise_level: "moderate",
    street_traffic: "busy_road",
    privacy_level: "moderate"
  },

  {
    id: crypto.randomUUID(),
    title: "Investment Opportunity - New Farm Apartment",
    description: "Prime investment property in sought-after New Farm. Spacious two-bedroom apartment with strong rental history and excellent tenant appeal.",
    city: "Brisbane",
    state: "QLD",
    price: 695000,
    bedrooms: 2,
    bathrooms: 2,
    status: "off_market",
    latitude: -27.4654,
    longitude: 153.0438,

    land_size_sqm: null,
    building_size_sqm: 95,
    number_of_levels: 1,
    year_built: 2016,
    property_condition: "good",

    has_pool: false,
    pool_type: "none",

    garden_type: "none",
    outdoor_entertaining_area: false,
    outdoor_area_size_sqm: 12,
    balcony_terrace: true,

    architectural_style: "contemporary",
    ceiling_height_m: 2.7,
    primary_light_direction: "east",
    natural_light_quality: "good",

    has_water_views: false,
    has_city_views: true,
    has_mountain_views: false,
    has_park_views: true,
    view_quality: "partial",

    parking_spaces: 1,
    parking_type: "garage",
    has_garage: true,
    storage_area: true,
    storage_size_sqm: 4,

    air_conditioning: "split_system",
    heating_type: "none",
    solar_panels: false,
    water_tank: false,

    security_system: true,
    security_features: ["intercom", "secure_parking"],
    smart_home_features: [],

    energy_efficiency_rating: 6,
    water_efficiency_rating: 3.5,
    sustainable_features: ["led_lighting"],

    kitchen_style: "modern",
    kitchen_features: ["stone_benchtops", "gas_cooking", "dishwasher"],
    ensuite_bathrooms: 1,
    powder_rooms: 0,
    bathroom_features: ["separate_shower"],

    flooring_types: ["tiles", "carpet"],
    interior_condition: "good",

    proximity_beach_km: 8,
    proximity_cbd_km: 2.5,
    proximity_schools_km: 0.8,
    proximity_shopping_km: 0.4,
    proximity_transport_km: 0.3,
    walkability_score: 90,

    rental_yield_estimate: 4.5,
    council_rates_annual: 1850,
    strata_fees_quarterly: 1200,
    water_rates_annual: 650,

    noise_level: "moderate",
    street_traffic: "moderate",
    privacy_level: "moderate"
  }
];

async function seedProperties() {
  console.log('\n🏠 Seeding comprehensive property listings to Supabase...\n');

  try {
    const { data, error } = await supabase
      .from('properties')
      .insert(properties)
      .select();

    if (error) {
      console.error('❌ Error inserting properties:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${data.length} properties!\\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   • Total properties: ${data.length}`);
    console.log(`   • Cities: ${[...new Set(data.map(p => p.city))].join(', ')}`);
    console.log(`   • Price range: $${Math.min(...data.map(p => p.price)).toLocaleString()} - $${Math.max(...data.map(p => p.price)).toLocaleString()}`);
    console.log(`   • Properties with pool: ${data.filter(p => p.has_pool).length}`);
    console.log(`   • Properties with water views: ${data.filter(p => p.has_water_views).length}`);
    console.log(`   • Average walkability score: ${Math.round(data.reduce((sum, p) => sum + (p.walkability_score || 0), 0) / data.length)}\\n`);

    console.log('🎉 Property seed data created successfully!\\n');
    console.log('👉 Visit http://localhost:8081/marketplace to see the properties\\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedProperties();
