# Global Location/Geography System Research for Agent Service Areas

**Date:** January 11, 2026
**Project:** Agent Network Hub
**Purpose:** Production-ready research for implementing a global location system for real estate agent service areas

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [How Other Platforms Handle Service Areas](#how-other-platforms-handle-service-areas)
3. [Service Area Specification Options](#service-area-specification-options)
4. [Location APIs Comparison](#location-apis-comparison)
5. [Location Search & Autocomplete Best Practices](#location-search--autocomplete-best-practices)
6. [UX Best Practices](#ux-best-practices)
7. [Database Schema Recommendations](#database-schema-recommendations)
8. [Final Recommendations for Agent Hub](#final-recommendations-for-agent-hub)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Code Examples](#code-examples)

---

## Executive Summary

Based on comprehensive research of industry-leading platforms and geospatial technologies, this document provides production-ready recommendations for implementing a global location system for agent service areas. The recommended approach combines:

- **Mapbox Geocoding API** for location search/autocomplete (95% accuracy, cost-effective at $0.50/1000 requests)
- **PostgreSQL with PostGIS extension** for geospatial database capabilities
- **Hybrid service area model**: Support for radius-based, region-based, and multiple service areas
- **Progressive location filter** with hierarchical disambiguation UI
- **Mobile-first design** with optional map toggle for service area visualization

**Estimated Implementation Cost:**
- Development: 4-6 weeks (MVP), 8-12 weeks (Full Feature)
- API Costs: ~$50-200/month for 100k-400k requests (Mapbox free tier: 100k/month)
- Infrastructure: Minimal additional cost if using existing PostgreSQL database

---

## How Other Platforms Handle Service Areas

### Real Estate Platforms

#### Zillow & Redfin (USA)
- **Zillow** operates as a marketplace connecting users with "Premier Agents" who cover specific metropolitan areas
- Uses comprehensive ZIP code coverage with agents ranked by coverage area and reviews
- **Redfin** employs in-house agents as employees assigned to specific metropolitan markets
- When Redfin doesn't have coverage in an area or agents are at capacity, they refer to "Partner Agents"
- Limitation: Both platforms focus primarily on major metropolitan areas, with limited rural coverage
- Users can search by city, neighborhood, or ZIP code with automatic agent matching

**Key Insight:** Major platforms use **market-based territories** rather than agent-defined service areas, which simplifies matching but reduces agent flexibility.

#### Domain.com.au & Realestate.com.au (Australia)
- **Domain** has 90% market penetration in Australia, competing with market leader REA Group (realestate.com.au)
- Both platforms allow agents to specify service areas at multiple levels:
  - Suburb level (most common)
  - Postcode level
  - Regional areas
- Regional coverage can be challenging - properties may not appear in expected regions due to location settings
- Most agents use real estate CMS platforms (like Mantis Property) with bulk uploaders to sync listings across both platforms
- **Strength varies by location:** Realestate.com.au stronger overall, but Domain dominates in Sydney and Melbourne

**Key Insight:** Australian platforms prioritize **suburb-level granularity** over broad radius-based coverage, reflecting tighter urban boundaries and local expertise.

### Global Platforms (Location Intelligence)

#### Airbnb & Uber
- Use **geohashing** technology to convert geographical coordinates into short alphanumeric strings
- Geohash divides Earth's surface into rectangular grid cells with unique codes
- Enables efficient proximity searches and spatial indexing
- **Challenge:** Boundary issues when locations fall into different quadrants
- **Pattern:** Geographic bias in service penetration - central and tourist areas have higher concentration

**Key Technologies:**
- Geohashing for location representation
- Real-time GPS tracking for dynamic positioning
- Proximity algorithms for rider-driver matching (Uber)
- Spatial penetration models for market analysis (Airbnb)

**Key Insight:** Geohashing works well for point-based services but has limitations for service area definitions. Better suited for proximity matching than area coverage.

#### Google Maps
- Comprehensive global coverage (99% of locations)
- Uses hierarchical location structure: Address → City → State → Country
- Handles disambiguation through autocomplete with location context
- Places API provides detailed information on 250+ million places
- Leverages AI (Gemini) for place summaries and recommendations

**Key Insight:** **Hierarchical presentation** with popularity-based ranking solves most disambiguation issues (e.g., Paris, France appears before Paris, Texas).

---

## Service Area Specification Options

### 1. Radius-Based Coverage

**Description:** Agent specifies center point + radius (e.g., "50km from Sydney CBD")

**Pros:**
- Simple to implement and understand
- Easy to calculate and query (ST_DWithin in PostGIS)
- Good for rural/regional areas with uniform coverage
- Minimal user input required

**Cons:**
- May include unwanted areas (e.g., water, inaccessible regions)
- Doesn't account for natural boundaries (rivers, highways)
- Can span multiple distinct markets
- Inefficient for agents covering non-contiguous areas

**Best For:** Regional agents, new agents without established territories, rural coverage

**Implementation Complexity:** Low ⭐

**Example Use Case:**
```
Agent: John Smith
Service Area: 30km radius from Brisbane CBD
Coverage: Automatically includes all suburbs within 30km
```

### 2. Region-Based (Pre-defined Areas)

**Description:** Agent selects from predefined regions (e.g., "Eastern Suburbs, Sydney" or "North Shore")

**Pros:**
- Aligns with how clients think about locations
- Easy for agents to specify ("I cover the Eastern Suburbs")
- Enables efficient database indexing and caching
- Can be mapped to known boundary polygons
- Supports hierarchical selection (State → City → Region → Suburb)

**Cons:**
- Requires comprehensive region database for all markets
- May not match agent's actual territory
- Limited flexibility for custom boundaries
- Maintenance overhead (updating region definitions)

**Best For:** Urban areas with well-defined neighborhoods, established agents with territory knowledge

**Implementation Complexity:** Medium ⭐⭐

**Example Use Case:**
```
Agent: Sarah Johnson
Service Areas:
  - Eastern Suburbs (Sydney)
  - Double Bay
  - Rose Bay
  - Bondi
```

### 3. Polygon-Based (Custom Drawing)

**Description:** Agent draws custom boundary on map defining exact service area

**Pros:**
- Maximum precision and control
- Excludes unwanted areas (water, commercial zones)
- Matches real-world agent territories
- Professional agents can define exact farm areas
- Great for real estate "farming" strategies

**Cons:**
- More complex UX - requires map interface
- Difficult on mobile devices
- Time-consuming to set up
- Requires polygon validation and simplification
- Higher database storage and query complexity
- Potential for irregular/overlapping polygons

**Best For:** Professional agents with established territories, niche market specialists

**Implementation Complexity:** High ⭐⭐⭐⭐

**Example Use Case:**
```
Agent: Michael Chen
Service Area: Custom polygon covering waterfront properties
             along Sydney Harbour (excludes inland suburbs)
Polygon: 45 coordinate points defining boundary
```

**Technical Note:** Can use Leaflet.Draw or Mapbox Draw GL for map interface

### 4. State/Country Level

**Description:** Broad coverage like "Anywhere in NSW" or "Anywhere in Australia"

**Pros:**
- Simple for agents with very broad coverage
- Good for commercial/industrial specialists
- Supports international agents
- Minimal configuration required

**Cons:**
- May return too many results for users
- Doesn't prioritize nearby agents
- Can dilute specialist expertise signal
- Less useful for matching user intent

**Best For:** Commercial agents, luxury specialists, international/relocation specialists

**Implementation Complexity:** Low ⭐

**Example Use Case:**
```
Agent: Patricia Wong
Specialty: Luxury Properties
Service Area: Entire NSW + VIC
Note: Will travel for high-value properties
```

### 5. Multiple Service Areas

**Description:** Agent covers non-contiguous areas (e.g., "Sydney AND Melbourne")

**Pros:**
- Supports agents who work multiple markets
- Reflects real business patterns (agents with offices in multiple cities)
- Enables franchise/network coverage
- Supports relocation specialists

**Cons:**
- More complex database queries (OR conditions)
- Potential performance impact
- Risk of agents over-extending coverage claims
- May confuse users ("Is this agent really local?")

**Best For:** Multi-office agencies, relocation specialists, franchise networks

**Implementation Complexity:** Medium ⭐⭐

**Example Use Case:**
```
Agent: David Lee
Agency: National Property Network
Service Areas:
  - Sydney Eastern Suburbs (primary)
  - Melbourne CBD (secondary office)
  - Brisbane Gold Coast (partner network)
```

### 6. "Anywhere in the World" Option

**Description:** Global coverage for international agents

**Pros:**
- Supports international real estate agents
- Good for expat/relocation services
- Enables global luxury market

**Cons:**
- May not be meaningful for most searches
- Difficult to prioritize in search results
- Could enable spam/low-quality listings

**Best For:** International property consultants, expat services, global luxury specialists

**Implementation Complexity:** Low ⭐

**Recommendation:** Allow but require verification/premium tier to prevent abuse

---

## Location APIs Comparison

### Detailed Feature & Pricing Analysis

| Provider | Free Tier | Pricing (per 1k requests) | Accuracy | Coverage | Key Features |
|----------|-----------|---------------------------|----------|----------|--------------|
| **Google Places API** | $200 credit/month (~40k requests) | $4.00 - $17.00 | 97% | 99% global | 250M+ places, Street View, AI summaries, comprehensive POI |
| **Mapbox Geocoding** | 100,000/month | $0.50 | 95% | Global | Customizable maps, offline support, excellent for custom design |
| **Azure Maps** | 5,000/month | $4.50 | ~96% | Global | 500 req/sec rate, address caching allowed, Microsoft ecosystem |
| **HERE Maps** | 250,000/month (Freemium) | $0.83 - $1.00 | ~94% | Global | Up to 10M/month before Enterprise needed, navigation focused |
| **OpenStreetMap (Nominatim)** | Unlimited (self-hosted) | Free (self-hosted) | 12-60% | Variable | Open source, no license fees, requires self-hosting for production |
| **GeoNames** | Unlimited (with username) | Free | Variable | 11M+ places | Hierarchical data, good for region/admin boundaries |

### Detailed Provider Analysis

#### Google Places API
**Best For:** Maximum accuracy and comprehensive POI data needs

**Pros:**
- Industry-leading accuracy (97%)
- Most comprehensive global coverage
- Excellent autocomplete with context-aware suggestions
- Street View integration
- Familiar interface for users
- Rich place details (hours, reviews, photos)
- AI-powered place summaries via Gemini

**Cons:**
- Most expensive option (1,400% price increase in recent years)
- Vendor lock-in to Google ecosystem
- Restrictive terms of service
- Requires displaying results on Google Maps (for some features)
- Can become prohibitively expensive at scale

**Pricing Examples:**
- 100k autocomplete requests/month: ~$340
- 100k geocode requests/month: ~$400
- **Total for moderate usage: $500-1000/month**

**Recommendation:** Only if budget allows and maximum accuracy is critical

---

#### Mapbox Geocoding (RECOMMENDED)
**Best For:** Cost-effective, customizable solution with excellent developer experience

**Pros:**
- Excellent price-to-performance ratio (95% accuracy at $0.50/1k)
- Generous free tier (100k requests/month)
- Highly customizable map styling
- Offline map support (crucial for mobile)
- No display restrictions
- Great documentation and developer tools
- Seamless integration with OpenStreetMap data
- MapGPT AI assistant for enhanced navigation
- Automotive-grade features (EV routing, 3D navigation)

**Cons:**
- Slightly lower accuracy than Google (95% vs 97%)
- Fewer POI details than Google
- May require more custom development for advanced features

**Pricing Examples:**
- 0-100k requests/month: FREE
- 100k-500k requests/month: $0.50/1k = $200-500/month
- **Excellent for growth: predictable, affordable scaling**

**Recommendation:** ✅ **BEST CHOICE for Agent Hub**

**Why:**
- Perfect balance of cost, accuracy, and features
- Free tier covers early-stage usage
- Affordable scaling as platform grows
- Customization allows brand differentiation
- No vendor lock-in

---

#### Azure Maps
**Best For:** Organizations already using Microsoft Azure infrastructure

**Pros:**
- Native Azure integration
- Good accuracy (~96%)
- High rate limits (500/sec)
- Address caching explicitly allowed
- Enterprise-grade SLAs
- Geocoding results can be stored permanently with active account

**Cons:**
- Smaller free tier (5k/month)
- Similar pricing to Google ($4.50/1k)
- Less flexible than Mapbox for custom styling
- Smaller developer community

**Pricing Examples:**
- 100k requests/month: ~$450
- 500k requests/month: ~$2,250

**Recommendation:** Only if already using Azure ecosystem

---

#### HERE Maps
**Best For:** High-volume usage or automotive applications

**Pros:**
- Very generous free tier (250k/month)
- Affordable pricing at scale ($0.83/1k)
- Excellent for routing and navigation
- Automotive-grade accuracy
- Scales to 10M/month before Enterprise tier needed

**Cons:**
- Lower accuracy than Google/Mapbox for geocoding
- Rate limits on free tier (5 req/sec)
- Data storage restrictions (Enterprise license required)
- Smaller developer ecosystem
- Less customization than Mapbox

**Pricing Examples:**
- 0-250k requests/month: FREE
- 250k-5M requests/month: $0.83/1k = $200-4,000/month

**Recommendation:** Good alternative if high volume is expected early

---

#### OpenStreetMap (Nominatim)
**Best For:** Budget-constrained projects or open-source enthusiasts willing to self-host

**Pros:**
- Completely free and open source
- No licensing fees or usage limits (self-hosted)
- Full control over data and privacy
- Active community support
- Good coverage in well-mapped areas

**Cons:**
- Very low accuracy (12-60% depending on region)
- Requires self-hosting for production use
- Public API severely limited (1 req/sec, ~1k/day)
- Inconsistent data quality across regions
- Requires integration with third-party services for routing, traffic, etc.
- Higher development and maintenance overhead
- Infrastructure costs can exceed API costs

**Pricing Examples:**
- API costs: $0 (free)
- Infrastructure (server, maintenance): ~$100-500/month
- **Avoided Google costs: Could save $420k/month for high-volume apps**

**Recommendation:** Only for very high volume (millions of requests) or open-source ideological fit

**Case Study:** One customer avoided $420,000/month Google bill by building custom OpenStreetMap solution, now paying only $1,500/month for infrastructure.

---

#### GeoNames
**Best For:** Administrative boundaries and hierarchical location data (complementary to geocoding APIs)

**Pros:**
- Completely free with username registration
- 11+ million place names globally
- Excellent hierarchical data (city → region → state → country)
- Good for admin boundaries
- Multiple hierarchy types (administrative, tourism, geography)
- Downloadable datasets

**Cons:**
- Variable data quality (crowdsourced)
- Inconsistent coverage across countries
- Not suitable as primary geocoding service
- Postal code data incomplete/outdated in many regions
- Sporadic updates

**Recommendation:** ✅ **USE AS SUPPLEMENT** to Mapbox for region/hierarchy data

**Use Case:** Load GeoNames data into database to populate region dropdown options, use Mapbox for actual geocoding/search.

---

### Summary Recommendation

**Primary API: Mapbox Geocoding**
- Cost: $0-200/month for most scenarios
- Accuracy: 95% (excellent)
- Free tier: 100k requests/month

**Supplementary Data: GeoNames**
- Cost: Free
- Use: Pre-populate region/admin boundary data
- Load into database for offline access

**Total Estimated API Cost:** $0-200/month for typical real estate platform (100k-400k requests/month)

---

## Location Search & Autocomplete Best Practices

### Handling Ambiguous Location Names

**Problem:** How to handle locations like "Paris" (could be Paris, France or Paris, Texas)?

**Solution: Hierarchical Disambiguation with Popularity Ranking**

```
User types: "paris"

Autocomplete shows:
1. Paris, Île-de-France, France        [Most popular]
2. Paris, Texas, United States
3. Paris, Ontario, Canada
4. Paris, Kentucky, United States

Display format: [City], [Region], [Country]
```

**Best Practices:**

1. **Show Full Hierarchy:** Always display City → State/Region → Country
2. **Rank by Popularity:** Most commonly searched location appears first
3. **Limit Results:** Show 5-10 suggestions maximum to avoid choice paralysis
4. **Progressive Typing:** Narrow results as user types more characters
5. **Visual Icons:** Use flag icons or location pins to aid scanning
6. **Distinct Typography:** Use different font weights/colors for hierarchy levels

**Example UI Implementation:**

```typescript
interface LocationSuggestion {
  city: string;
  region: string;
  country: string;
  countryCode: string; // For flag icons
  popularity: number;  // For ranking
  coordinates: { lat: number; lng: number };
}

// Display format
function formatSuggestion(loc: LocationSuggestion): string {
  return `${loc.city}, ${loc.region}, ${loc.country}`;
}

// Sort by popularity
suggestions.sort((a, b) => b.popularity - a.popularity);
```

### Location Hierarchy Display

**Recommended Hierarchy Levels:**

1. **Country** (United States, Australia, United Kingdom)
2. **State/Province** (New South Wales, California, Ontario)
3. **City/Metro Area** (Sydney, Los Angeles, Toronto)
4. **Region/District** (Eastern Suburbs, Beverly Hills, Downtown)
5. **Suburb/Neighborhood** (Bondi, Santa Monica, Yorkville)
6. **Address** (123 Main St)

**Flexibility for Different Countries:**

- **USA:** State → County → City → ZIP Code
- **Australia:** State → Region → Suburb → Postcode
- **Europe:** Province → Region → City

**Database Schema for Hierarchy:**

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL, -- 'country', 'state', 'city', 'suburb'
  parent_id UUID REFERENCES locations(id),
  country_code CHAR(2),
  coordinates GEOGRAPHY(POINT, 4326),
  bbox GEOGRAPHY(POLYGON, 4326), -- Bounding box
  population INTEGER, -- For popularity ranking
  search_rank INTEGER, -- Pre-computed rank for autocomplete

  -- Hierarchy denormalization for fast queries
  country_id UUID,
  state_id UUID,
  city_id UUID,

  CONSTRAINT valid_level CHECK (level IN ('country', 'state', 'region', 'city', 'suburb', 'postcode'))
);

-- Index for fast autocomplete
CREATE INDEX idx_locations_name_trgm ON locations USING gin(name gin_trgm_ops);
CREATE INDEX idx_locations_search_rank ON locations(search_rank);
CREATE INDEX idx_locations_parent ON locations(parent_id);
```

### Autocomplete UX Best Practices

Based on research from industry leaders and UX testing:

**1. Limit Suggestions**
- **Maximum 10 suggestions** (testing shows more causes choice paralysis)
- Prioritize closest/most relevant matches
- Show geographical proximity first if user location available

**2. Never Auto-Fill, Always Auto-Suggest**
- Auto-filling can lead to errors if prediction is wrong
- Always require explicit user selection from dropdown
- Differentiate suggested text from typed text (styling/color)

**3. Keyboard Navigation Support**
- Up/Down arrow keys to navigate list
- Enter to select highlighted suggestion
- Escape to close dropdown
- Highlight selected item clearly
- Announce selection to screen readers (accessibility)

**4. Minimum Characters & Debouncing**
- Require 2-3 characters before showing suggestions
- Debounce API calls (200-300ms) to reduce requests
- Show loading indicator for slow responses

**5. Location-Based Prioritization**
- Use user's IP geolocation or browser location API
- Prioritize nearby locations in results
- Example: "Miami" searched from Australia → show Miami QLD before Miami FL

**6. Visual Hierarchy**
```
Icon  Main Text         Secondary Text
🏙️   Sydney            New South Wales, Australia
🏙️   Sydney            Nova Scotia, Canada
```

**7. Error Handling**
- If no results: "No locations found for 'xyz'"
- Suggest alternatives: "Did you mean: Sydney, NSW?"
- Allow fallback to broader search

**8. Mobile Optimization**
- Larger touch targets (min 44px height)
- Full-width dropdown on mobile
- Avoid tiny scrollable lists
- Consider geolocation as default option

### Caching Strategies

**Multi-Level Caching for Performance:**

**1. Browser Cache (Client-Side)**
```typescript
// Cache popular searches in localStorage
const CACHE_KEY = 'location_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCachedLocation(query: string): LocationResult | null {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const cached = cache[query];

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}
```

**2. CDN Edge Caching**
- Cache autocomplete responses at CDN edge (Cloudflare, CloudFront)
- Short TTL for dynamic data (5-60 seconds)
- Longer TTL for static location data (24 hours - 7 days)
- Use cache keys based on query + user location

**Example Cache-Control Headers:**
```
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

**3. Application Cache (Redis/Memcached)**
- Cache frequently searched locations (in-memory)
- Cache geocoding results for common addresses
- TTL: 1-24 hours depending on data freshness needs

```typescript
// Redis caching example
async function geocodeWithCache(address: string): Promise<GeoResult> {
  const cacheKey = `geocode:${address}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss - call API
  const result = await mapboxGeocode(address);

  // Store in cache (24 hour TTL)
  await redis.setex(cacheKey, 86400, JSON.stringify(result));

  return result;
}
```

**4. Database Cache**
- Pre-populate common locations in database
- Store geocoding results for searched addresses
- Use materialized views for complex hierarchical queries

**Performance Impact:**
- Browser cache: ~0ms latency (instant)
- CDN edge cache: ~10-50ms latency
- Application cache: ~1-5ms latency
- Database: ~10-100ms latency
- External API: ~100-500ms latency

**Recommendation:** Implement all levels for optimal performance and cost reduction

---

## UX Best Practices

### Agent Service Area Selection Interface

**Recommended Approach: Progressive Disclosure**

Start simple, add complexity as needed:

**Level 1: Quick Setup (Default)**
```
┌─────────────────────────────────────────┐
│ Where do you operate?                   │
│                                         │
│ [Search location...]                    │
│                                         │
│ Service Radius: 25km                    │
│ ├────────●──────────┤                  │
│ 5km              100km                  │
│                                         │
│ ✓ Use as service area                  │
└─────────────────────────────────────────┘
```

**Level 2: Multiple Regions (Optional)**
```
┌─────────────────────────────────────────┐
│ Service Areas (2)                       │
│                                         │
│ 📍 Sydney Eastern Suburbs              │
│    (25km radius)                        │
│    [Edit] [Remove]                      │
│                                         │
│ 📍 North Shore, Sydney                 │
│    (Selected region)                    │
│    [Edit] [Remove]                      │
│                                         │
│ + Add another area                      │
└─────────────────────────────────────────┘
```

**Level 3: Advanced (For Power Users)**
```
┌─────────────────────────────────────────┐
│ Advanced Service Area                   │
│                                         │
│ [Tabs: Radius | Regions | Map Draw]    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │         MAP INTERFACE               │ │
│ │      [Draw polygon on map]          │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Drawing Tools: ◯ Circle  ▢ Rectangle   │
│               ⬡ Polygon  ✏️ Freehand    │
└─────────────────────────────────────────┘
```

### Best Practices by Screen Size

#### Desktop (>1024px)
✅ **Do:**
- Show map interface as option
- Allow side-by-side map + list view
- Enable polygon drawing tools
- Show detailed hierarchy in autocomplete

❌ **Don't:**
- Force map interface on users
- Auto-zoom maps without user action
- Use tiny map pins (min 36x36px for clicks)

#### Mobile (<768px)
✅ **Do:**
- Default to list view
- Make autocomplete full-width
- Use geolocation button prominently
- Large touch targets (44px minimum)
- Allow map toggle, but don't default to it

❌ **Don't:**
- Show map by default (wastes screen space)
- Use polygon drawing (too difficult on touch)
- Require precise map interactions
- Use dropdown scrollable lists

**Mobile-Specific Pattern:**
```
┌─────────────────┐
│ 📍 Use my       │  ← Large button
│    location     │     for geolocation
└─────────────────┘

        OR

┌─────────────────┐
│ 🔍 Search...    │  ← Full-width search
└─────────────────┘

[List of results] ← Default view
[Show Map] ← Optional toggle
```

### Displaying Service Areas to Users (Directory Browse)

**Option 1: Simple Text Display**
```
Agent: John Smith
Service Areas: Eastern Suburbs, North Shore (Sydney)
              Within 30km of Sydney CBD
```

**Option 2: Map Visualization (Recommended)**
```
┌──────────────────────────────────────┐
│ Agent: John Smith                    │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │      [Mini Map showing           │ │
│ │       highlighted regions]       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Coverage: Eastern Suburbs, North     │
│          Shore, and 12 other areas   │
│                                      │
│ [View Full Coverage Map]             │
└──────────────────────────────────────┘
```

**Option 3: Badge/Tag System**
```
Agent: John Smith
📍 Eastern Suburbs  📍 Bondi  📍 Double Bay
📍 North Shore  📍 +8 more areas
```

**Recommendation:** Use **Option 3 (badges)** for list view, **Option 2 (map)** for detail page

---

## Database Schema Recommendations

### Option A: Hybrid Model (RECOMMENDED)

Supports multiple service area types efficiently:

```sql
-- Agents table (simplified)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service areas (flexible schema supporting all types)
CREATE TABLE agent_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Area type: 'radius', 'region', 'polygon', 'state', 'country'
  area_type VARCHAR(50) NOT NULL,

  -- For radius-based
  center_point GEOGRAPHY(POINT, 4326),
  radius_km NUMERIC(10, 2),

  -- For region-based
  region_id UUID REFERENCES locations(id),
  region_name VARCHAR(255), -- Denormalized for performance

  -- For polygon-based
  boundary GEOGRAPHY(POLYGON, 4326),

  -- For state/country level
  country_code CHAR(2),
  state_code VARCHAR(10),

  -- Metadata
  is_primary BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1, -- For multiple areas
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_area_type CHECK (
    area_type IN ('radius', 'region', 'polygon', 'state', 'country', 'global')
  ),

  -- Ensure data integrity per type
  CONSTRAINT radius_requires_center CHECK (
    area_type != 'radius' OR (center_point IS NOT NULL AND radius_km IS NOT NULL)
  ),
  CONSTRAINT region_requires_region_id CHECK (
    area_type != 'region' OR region_id IS NOT NULL
  ),
  CONSTRAINT polygon_requires_boundary CHECK (
    area_type != 'polygon' OR boundary IS NOT NULL
  )
);

-- Locations table (hierarchical)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL, -- 'country', 'state', 'city', 'suburb', 'region'
  parent_id UUID REFERENCES locations(id),

  -- Geographical data
  coordinates GEOGRAPHY(POINT, 4326),
  bbox GEOGRAPHY(POLYGON, 4326),

  -- Hierarchy cache (denormalized for performance)
  country_id UUID,
  state_id UUID,
  city_id UUID,

  -- Search optimization
  population INTEGER,
  search_rank INTEGER, -- Pre-computed popularity

  -- Codes
  country_code CHAR(2),
  state_code VARCHAR(10),
  postal_code VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_level CHECK (
    level IN ('country', 'state', 'region', 'city', 'suburb', 'postcode')
  )
);

-- Indexes for performance
CREATE INDEX idx_service_areas_agent ON agent_service_areas(agent_id);
CREATE INDEX idx_service_areas_type ON agent_service_areas(area_type);
CREATE INDEX idx_service_areas_region ON agent_service_areas(region_id);

-- Spatial indexes (PostGIS)
CREATE INDEX idx_service_areas_center ON agent_service_areas USING GIST(center_point);
CREATE INDEX idx_service_areas_boundary ON agent_service_areas USING GIST(boundary);
CREATE INDEX idx_locations_coords ON locations USING GIST(coordinates);
CREATE INDEX idx_locations_bbox ON locations USING GIST(bbox);

-- Text search index for autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_locations_name_trgm ON locations USING gin(name gin_trgm_ops);
```

### Query Examples

**1. Find agents serving a specific location (radius-based):**

```sql
-- User searches for agents near "Bondi Beach, Sydney"
-- Coordinates: -33.8915, 151.2767

SELECT
  a.id,
  a.name,
  sa.area_type,
  sa.radius_km,
  ST_Distance(
    sa.center_point::geography,
    ST_MakePoint(151.2767, -33.8915)::geography
  ) / 1000 AS distance_km
FROM agents a
JOIN agent_service_areas sa ON a.id = sa.agent_id
WHERE sa.area_type = 'radius'
  AND ST_DWithin(
    sa.center_point::geography,
    ST_MakePoint(151.2767, -33.8915)::geography,
    sa.radius_km * 1000 -- Convert km to meters
  )
ORDER BY distance_km ASC
LIMIT 20;
```

**2. Find agents serving a specific region:**

```sql
-- User searches for "Eastern Suburbs, Sydney"
-- Region ID: 'abc-123-...'

SELECT
  a.id,
  a.name,
  sa.region_name,
  sa.priority
FROM agents a
JOIN agent_service_areas sa ON a.id = sa.agent_id
WHERE sa.area_type = 'region'
  AND sa.region_id = 'abc-123-...'
ORDER BY sa.is_primary DESC, sa.priority ASC;
```

**3. Find agents serving location with polygon areas:**

```sql
-- Check if point falls within agent's custom polygon
SELECT
  a.id,
  a.name,
  sa.area_type
FROM agents a
JOIN agent_service_areas sa ON a.id = sa.agent_id
WHERE sa.area_type = 'polygon'
  AND ST_Contains(
    sa.boundary::geometry,
    ST_MakePoint(151.2767, -33.8915)::geometry
  );
```

**4. Combined query (all service area types):**

```sql
-- Find ALL agents serving Bondi Beach regardless of service area type
WITH search_point AS (
  SELECT ST_MakePoint(151.2767, -33.8915)::geography AS geog
),
search_location AS (
  SELECT id, city_id, state_id, country_code
  FROM locations
  WHERE name ILIKE '%bondi%'
  LIMIT 1
)
SELECT DISTINCT
  a.id,
  a.name,
  sa.area_type,
  CASE
    WHEN sa.area_type = 'radius' THEN
      ST_Distance(sa.center_point, sp.geog) / 1000
    ELSE NULL
  END AS distance_km
FROM agents a
JOIN agent_service_areas sa ON a.id = sa.agent_id
CROSS JOIN search_point sp
CROSS JOIN search_location sl
WHERE
  -- Radius match
  (sa.area_type = 'radius' AND ST_DWithin(sa.center_point, sp.geog, sa.radius_km * 1000))
  OR
  -- Region match
  (sa.area_type = 'region' AND sa.region_id = sl.id)
  OR
  -- Polygon match
  (sa.area_type = 'polygon' AND ST_Contains(sa.boundary::geometry, ST_MakePoint(151.2767, -33.8915)::geometry))
  OR
  -- State match
  (sa.area_type = 'state' AND sa.state_code = (SELECT state_code FROM locations WHERE id = sl.state_id))
  OR
  -- Country match
  (sa.area_type = 'country' AND sa.country_code = sl.country_code)
  OR
  -- Global coverage
  (sa.area_type = 'global')
ORDER BY
  distance_km ASC NULLS LAST,
  sa.is_primary DESC,
  sa.priority ASC
LIMIT 50;
```

### Option B: Simplified Region-Only Model

For MVP or if only region-based coverage is needed:

```sql
-- Simpler many-to-many relationship
CREATE TABLE agent_regions (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  region_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (agent_id, region_id)
);

CREATE INDEX idx_agent_regions_agent ON agent_regions(agent_id);
CREATE INDEX idx_agent_regions_region ON agent_regions(region_id);

-- Query: Find agents in region
SELECT a.*
FROM agents a
JOIN agent_regions ar ON a.id = ar.agent_id
WHERE ar.region_id = 'abc-123-...'
ORDER BY ar.is_primary DESC;
```

**When to Use:**
- MVP phase
- Only supporting predefined regions
- Simpler to implement and maintain

### Option C: Pure PostGIS Geometry Model

For maximum spatial query performance:

```sql
CREATE TABLE agent_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Store everything as geometry (polygons, circles converted to polygons)
  service_boundary GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,

  -- Metadata
  area_name VARCHAR(255),
  area_description TEXT,
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index
CREATE INDEX idx_service_areas_boundary_gist ON agent_service_areas USING GIST(service_boundary);

-- Query: Point-in-polygon search
SELECT a.*, sa.area_name
FROM agents a
JOIN agent_service_areas sa ON a.id = sa.agent_id
WHERE ST_Contains(
  sa.service_boundary::geometry,
  ST_MakePoint(151.2767, -33.8915)::geometry
);
```

**When to Use:**
- Advanced spatial queries needed
- Primary focus on polygon/custom areas
- Performance-critical spatial searches

### Performance Considerations

**Index Types:**
- **GIST (Generalized Search Tree):** Best for spatial data (geography/geometry columns)
- **GIN (Generalized Inverted Index):** Best for text search (trigram autocomplete)
- **B-tree:** Best for exact matches and range queries (IDs, timestamps)

**Query Optimization:**
- Use `ST_DWithin` for radius queries (faster than `ST_Distance`)
- Prefer `geography` type for accurate distance calculations
- Use `geometry` type for faster spatial operations when accuracy < 1% is acceptable
- Cache frequently searched locations in application layer
- Consider materialized views for complex hierarchical queries

**Storage Estimates:**
- Point coordinates: ~32 bytes
- Simple polygon (10 points): ~320 bytes
- Complex polygon (100 points): ~3.2 KB
- Estimated: 1-10 KB per service area

**For 10,000 agents with avg 3 service areas each:**
- Storage: ~30-300 MB (negligible)
- Index size: ~100-500 MB

### Database Choice Comparison

#### PostgreSQL + PostGIS (RECOMMENDED)

**Pros:**
- Industry standard for geospatial data
- 1000+ geospatial functions
- Excellent accuracy and performance
- ACID compliance
- Mature ecosystem and tooling
- Free and open source

**Cons:**
- Requires PostGIS extension
- Steeper learning curve for spatial queries
- More complex than simple lat/lng storage

**Recommendation:** ✅ **Use PostgreSQL + PostGIS**

**Why:**
- Your project already uses Supabase (which is PostgreSQL)
- Superior spatial capabilities
- ACID compliance for critical real estate data
- Free and no vendor lock-in

#### MongoDB Geospatial

**Pros:**
- Simpler geospatial queries (3 functions vs 1000+)
- Faster for simple proximity queries (6x in some tests)
- JSON document model (flexible schema)
- Good for rapid prototyping

**Cons:**
- Limited geospatial functions (only geoWithin, geoIntersects, nearSphere)
- Eventual consistency (not ACID by default)
- Weaker for complex spatial analysis
- Requires separate database if not already using MongoDB

**Recommendation:** ❌ Don't switch to MongoDB just for geo features

#### MySQL Spatial

**Pros:**
- Basic spatial support included
- Familiar to many developers

**Cons:**
- Much weaker spatial capabilities than PostGIS
- Limited geometry types
- Slower spatial queries
- Less mature spatial ecosystem

**Recommendation:** ❌ Use PostGIS instead for any serious geospatial needs

---

## Final Recommendations for Agent Hub

### Recommended Architecture

**1. Location API: Mapbox Geocoding**
- Cost: Free (100k/month), then $0.50/1k
- Accuracy: 95%
- Features: Autocomplete, geocoding, reverse geocoding
- **Action:** Sign up for Mapbox account, get API key

**2. Supplementary Data: GeoNames**
- Cost: Free
- Use: Pre-populate regions, admin boundaries, hierarchical data
- **Action:** Download GeoNames dataset, import into database

**3. Database: PostgreSQL + PostGIS**
- Cost: $0 (using existing Supabase database)
- **Action:** Enable PostGIS extension in Supabase

**4. Service Area Model: Hybrid (Radius + Regions + Multiple Areas)**
- Support radius-based for quick setup
- Support region-based for common use cases
- Allow multiple service areas per agent
- Save polygon drawing for future enhancement (Phase 2)

**5. UX Pattern: Progressive Disclosure**
- Simple autocomplete search with radius slider (default)
- Option to add multiple regions
- Mobile-first design with optional map view

### Recommended Database Schema

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search

-- Locations table (import from GeoNames)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geonames_id INTEGER UNIQUE,
  name VARCHAR(255) NOT NULL,
  ascii_name VARCHAR(255),
  level VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES locations(id),

  -- Geographical
  coordinates GEOGRAPHY(POINT, 4326),
  bbox GEOGRAPHY(POLYGON, 4326),

  -- Hierarchy (denormalized)
  country_id UUID,
  state_id UUID,
  city_id UUID,
  country_code CHAR(2),
  state_code VARCHAR(10),

  -- Search
  population INTEGER,
  search_rank INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent service areas (hybrid model)
CREATE TABLE agent_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  area_type VARCHAR(50) NOT NULL, -- 'radius', 'region', 'state', 'country'

  -- Radius fields
  center_point GEOGRAPHY(POINT, 4326),
  radius_km NUMERIC(10, 2),

  -- Region fields
  region_id UUID REFERENCES locations(id),
  region_name VARCHAR(255),

  -- State/Country fields
  country_code CHAR(2),
  state_code VARCHAR(10),

  -- Metadata
  is_primary BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_area_type CHECK (area_type IN ('radius', 'region', 'state', 'country'))
);

-- Indexes
CREATE INDEX idx_service_areas_agent ON agent_service_areas(agent_id);
CREATE INDEX idx_service_areas_center_gist ON agent_service_areas USING GIST(center_point);
CREATE INDEX idx_locations_coords_gist ON locations USING GIST(coordinates);
CREATE INDEX idx_locations_name_trgm ON locations USING gin(name gin_trgm_ops);
CREATE INDEX idx_locations_search_rank ON locations(search_rank);
```

### Implementation Phases

#### Phase 1: MVP (Weeks 1-4)

**Scope:** Basic radius-based service areas with autocomplete

**Features:**
- ✅ Mapbox autocomplete integration
- ✅ Single service area per agent (radius-based)
- ✅ Simple search: "Find agents near [location]"
- ✅ Basic location hierarchy display
- ✅ Mobile-responsive list view

**Database:**
- `locations` table (seed with major cities only)
- `agent_service_areas` table (radius type only)

**API Integration:**
- Mapbox Geocoding API for autocomplete
- Mapbox Geocoding API for address → coordinates

**Estimated Effort:** 2-4 weeks (1 developer)

**Deliverables:**
1. Location autocomplete component (React)
2. Service area selector for agent profile setup
3. "Find agents near me" search functionality
4. Basic distance-based ranking

**Success Metrics:**
- Agents can set service area in < 2 minutes
- Location autocomplete returns results < 500ms
- 95%+ search queries return relevant agents

---

#### Phase 2: Enhanced Features (Weeks 5-8)

**Scope:** Multiple service areas, region-based selection, improved UX

**Features:**
- ✅ Multiple service areas per agent
- ✅ Region-based selection (dropdowns for popular regions)
- ✅ Combined radius + region support
- ✅ Map visualization of service areas (view only)
- ✅ "Near me" geolocation button
- ✅ Service area badges on agent profiles

**Database:**
- Expand `locations` table (import GeoNames data)
- Support multiple rows per agent in `agent_service_areas`

**API Integration:**
- GeoNames data import (one-time)
- Mapbox Static Images API for service area maps

**Estimated Effort:** 3-4 weeks (1 developer)

**Deliverables:**
1. Multi-region selector component
2. Import script for GeoNames data
3. Service area map preview
4. Enhanced agent profile with service area display

**Success Metrics:**
- 50%+ agents add multiple service areas
- Users can browse by region effectively
- Map preview loads < 1 second

---

#### Phase 3: Advanced Features (Weeks 9-12)

**Scope:** Polygon drawing, state/country coverage, advanced search

**Features:**
- ✅ Polygon drawing interface (desktop)
- ✅ State-level and country-level coverage options
- ✅ "Anywhere in the world" for global agents
- ✅ Advanced filters (combine location + specialty + price range)
- ✅ Service area analytics for agents

**Database:**
- Add `boundary` column for polygon support
- Add `area_type` = 'polygon', 'state', 'country', 'global'

**API Integration:**
- Mapbox Draw GL for polygon drawing
- Mapbox GL JS for interactive maps

**Estimated Effort:** 4-6 weeks (1 developer)

**Deliverables:**
1. Map drawing interface
2. Polygon editor component
3. Advanced search filters
4. Agent analytics dashboard (coverage stats)

**Success Metrics:**
- 20%+ professional agents use polygon areas
- Advanced search used by 30%+ users
- Zero performance degradation with polygon queries

---

#### Phase 4: Optimization & Scale (Weeks 13-16)

**Scope:** Performance optimization, caching, analytics

**Features:**
- ✅ Redis caching for frequent searches
- ✅ CDN caching for static location data
- ✅ Search analytics and ranking improvements
- ✅ A/B testing different UX patterns
- ✅ Mobile app optimization

**Database:**
- Query optimization and index tuning
- Materialized views for complex queries
- Partitioning if needed for scale

**Infrastructure:**
- Redis/Memcached setup
- CDN configuration (Cloudflare)
- Monitoring and alerting

**Estimated Effort:** 3-4 weeks (1 developer)

**Deliverables:**
1. Caching layer implementation
2. Performance monitoring dashboard
3. Search analytics reports
4. Optimized mobile experience

**Success Metrics:**
- 95th percentile search latency < 200ms
- 90%+ cache hit rate for autocomplete
- 99.9% uptime for location services

---

### Total Timeline Summary

| Phase | Duration | Cost | Features |
|-------|----------|------|----------|
| Phase 1: MVP | 2-4 weeks | $0 (free tier) | Basic radius search, autocomplete |
| Phase 2: Enhanced | 3-4 weeks | $50-100/month | Multiple areas, regions, maps |
| Phase 3: Advanced | 4-6 weeks | $100-200/month | Polygons, global coverage |
| Phase 4: Optimization | 3-4 weeks | $150-300/month | Caching, analytics, scale |
| **Total** | **12-18 weeks** | **$300-600/month** | **Full-featured system** |

**MVP to Production:** 3-6 months with 1 full-time developer

---

## Code Examples

### 1. Mapbox Autocomplete Integration (React/TypeScript)

```typescript
// lib/mapbox-geocoder.ts
import type { Coordinates, GeocodeResult } from './geocoder';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export interface MapboxResponse {
  features: MapboxFeature[];
}

/**
 * Autocomplete search using Mapbox Geocoding API
 */
export async function mapboxAutocomplete(
  query: string,
  options: {
    country?: string; // ISO 3166-1 alpha-2 code (e.g., 'au', 'us')
    types?: string[]; // e.g., ['place', 'locality', 'neighborhood']
    proximity?: Coordinates; // Bias results near this location
    limit?: number;
  } = {}
): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    autocomplete: 'true',
    limit: String(options.limit || 5),
  });

  if (options.country) {
    params.append('country', options.country);
  }

  if (options.types && options.types.length > 0) {
    params.append('types', options.types.join(','));
  }

  if (options.proximity) {
    params.append('proximity', `${options.proximity.lng},${options.proximity.lat}`);
  }

  const url = `${GEOCODING_API}/${encodeURIComponent(query)}.json?${params}`;

  try {
    const response = await fetch(url);
    const data: MapboxResponse = await response.json();

    return data.features.map(f => f.place_name);
  } catch (error) {
    console.error('Mapbox autocomplete error:', error);
    return [];
  }
}

/**
 * Geocode address to coordinates
 */
export async function mapboxGeocode(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    limit: '1',
  });

  const url = `${GEOCODING_API}/${encodeURIComponent(address)}.json?${params}`;

  try {
    const response = await fetch(url);
    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) return null;

    const feature = data.features[0];
    const [lng, lat] = feature.center;

    // Extract city, state from context
    const city = feature.context?.find(c => c.id.startsWith('place'))?.text;
    const state = feature.context?.find(c => c.id.startsWith('region'))?.text;

    return {
      address: feature.place_name,
      coordinates: { lat, lng },
      city,
      state,
    };
  } catch (error) {
    console.error('Mapbox geocode error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function mapboxReverseGeocode(
  coordinates: Coordinates
): Promise<string | null> {
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
  });

  const url = `${GEOCODING_API}/${coordinates.lng},${coordinates.lat}.json?${params}`;

  try {
    const response = await fetch(url);
    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) return null;

    return data.features[0].place_name;
  } catch (error) {
    console.error('Mapbox reverse geocode error:', error);
    return null;
  }
}
```

### 2. Enhanced Location Search Component

```typescript
// components/filters/LocationSearchFilter.tsx
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { MapPin, X, Loader2, LocateFixed } from "lucide-react";
import { mapboxAutocomplete, mapboxGeocode } from "@/lib/mapbox-geocoder";
import type { Coordinates } from "@/lib/geocoder";

interface LocationSearchFilterProps {
  onLocationChange: (location: Coordinates | null, radius: number) => void;
  country?: string; // ISO code: 'au', 'us', etc.
  className?: string;
}

export function LocationSearchFilter({
  onLocationChange,
  country = 'au',
  className = ""
}: LocationSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState(25);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2 && !selectedLocation) {
        setLoading(true);
        try {
          const results = await mapboxAutocomplete(searchQuery, {
            country,
            types: ['place', 'locality', 'neighborhood', 'address'],
            proximity: coordinates || undefined, // Bias to current selection
            limit: 7,
          });
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Autocomplete error:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedLocation, country, coordinates]);

  // Notify parent of changes
  useEffect(() => {
    onLocationChange(coordinates, radius);
  }, [coordinates, radius, onLocationChange]);

  // Select suggestion
  const handleSelectSuggestion = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setSelectedLocation(suggestion);
    setShowSuggestions(false);

    const result = await mapboxGeocode(suggestion);
    if (result) {
      setCoordinates(result.coordinates);
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchQuery("");
    setSelectedLocation(null);
    setCoordinates(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Use current location (geolocation)
  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoordinates(coords);

        // Reverse geocode to get address
        const { mapboxReverseGeocode } = await import('@/lib/mapbox-geocoder');
        const address = await mapboxReverseGeocode(coords);

        if (address) {
          setSearchQuery(address);
          setSelectedLocation(address);
        } else {
          setSearchQuery(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          setSelectedLocation('Current Location');
        }

        setGeolocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please search manually.');
        setGeolocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Geolocation Button (Mobile Priority) */}
      <Button
        variant="outline"
        onClick={handleUseMyLocation}
        disabled={geolocating}
        className="w-full md:hidden" // Show on mobile only
      >
        {geolocating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting location...
          </>
        ) : (
          <>
            <LocateFixed className="mr-2 h-4 w-4" />
            Use my location
          </>
        )}
      </Button>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedLocation) {
                setSelectedLocation(null);
                setCoordinates(null);
              }
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-10 bg-background border-border"
            disabled={loading}
          />

          {/* Loading Spinner */}
          {loading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}

          {/* Clear Button */}
          {selectedLocation && !loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Radius Slider (only shown when location selected) */}
      {selectedLocation && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Search Radius</span>
            <span className="text-sm font-semibold text-primary">{radius} km</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={(value) => setRadius(value[0])}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Database Query Functions (PostgreSQL + PostGIS)

```typescript
// lib/database/location-queries.ts
import { supabase } from '@/integrations/supabase/client';
import type { Coordinates } from '@/lib/geocoder';

export interface AgentServiceArea {
  id: string;
  agent_id: string;
  area_type: 'radius' | 'region' | 'state' | 'country';
  center_point?: { lat: number; lng: number };
  radius_km?: number;
  region_id?: string;
  region_name?: string;
  country_code?: string;
  state_code?: string;
  is_primary: boolean;
  priority: number;
}

export interface AgentMatch {
  id: string;
  name: string;
  email: string;
  distance_km?: number;
  service_area_type: string;
  is_primary_area: boolean;
}

/**
 * Find agents serving a specific location (all service area types)
 */
export async function findAgentsServingLocation(
  coordinates: Coordinates,
  maxResults: number = 50
): Promise<AgentMatch[]> {
  // This would call a PostgreSQL function for efficiency
  // Example SQL function creation:
  /*
    CREATE OR REPLACE FUNCTION find_agents_serving_location(
      search_lat NUMERIC,
      search_lng NUMERIC,
      max_results INTEGER DEFAULT 50
    )
    RETURNS TABLE (
      agent_id UUID,
      agent_name VARCHAR,
      agent_email VARCHAR,
      distance_km NUMERIC,
      service_area_type VARCHAR,
      is_primary_area BOOLEAN
    )
    AS $$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT
        a.id,
        a.name,
        a.email,
        CASE
          WHEN sa.area_type = 'radius' THEN
            ST_Distance(
              sa.center_point::geography,
              ST_MakePoint(search_lng, search_lat)::geography
            ) / 1000
          ELSE NULL
        END AS distance_km,
        sa.area_type,
        sa.is_primary
      FROM agents a
      JOIN agent_service_areas sa ON a.id = sa.agent_id
      WHERE
        -- Radius match
        (sa.area_type = 'radius' AND ST_DWithin(
          sa.center_point::geography,
          ST_MakePoint(search_lng, search_lat)::geography,
          sa.radius_km * 1000
        ))
        OR
        -- Additional types would be handled here
        (sa.area_type = 'country') -- Matches all
      ORDER BY
        distance_km ASC NULLS LAST,
        sa.is_primary DESC,
        sa.priority ASC
      LIMIT max_results;
    END;
    $$ LANGUAGE plpgsql;
  */

  const { data, error } = await supabase
    .rpc('find_agents_serving_location', {
      search_lat: coordinates.lat,
      search_lng: coordinates.lng,
      max_results: maxResults,
    });

  if (error) {
    console.error('Error finding agents:', error);
    return [];
  }

  return data || [];
}

/**
 * Add service area for agent
 */
export async function addAgentServiceArea(
  agentId: string,
  serviceArea: Partial<AgentServiceArea>
): Promise<boolean> {
  // Convert coordinates to PostGIS format if radius type
  let insertData: any = {
    agent_id: agentId,
    area_type: serviceArea.area_type,
    is_primary: serviceArea.is_primary || false,
    priority: serviceArea.priority || 1,
  };

  if (serviceArea.area_type === 'radius' && serviceArea.center_point) {
    // Use raw SQL for PostGIS point insertion
    const { error } = await supabase.rpc('insert_radius_service_area', {
      p_agent_id: agentId,
      p_lat: serviceArea.center_point.lat,
      p_lng: serviceArea.center_point.lng,
      p_radius_km: serviceArea.radius_km,
      p_is_primary: serviceArea.is_primary || false,
    });

    return !error;
  } else if (serviceArea.area_type === 'region') {
    insertData.region_id = serviceArea.region_id;
    insertData.region_name = serviceArea.region_name;
  } else if (serviceArea.area_type === 'state' || serviceArea.area_type === 'country') {
    insertData.country_code = serviceArea.country_code;
    insertData.state_code = serviceArea.state_code;
  }

  const { error } = await supabase
    .from('agent_service_areas')
    .insert(insertData);

  return !error;
}

/**
 * Get all service areas for an agent
 */
export async function getAgentServiceAreas(
  agentId: string
): Promise<AgentServiceArea[]> {
  const { data, error } = await supabase
    .from('agent_service_areas')
    .select('*')
    .eq('agent_id', agentId)
    .order('is_primary', { ascending: false })
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching service areas:', error);
    return [];
  }

  // Transform PostGIS geography to JS object
  return (data || []).map(area => ({
    ...area,
    center_point: area.center_point
      ? { lat: area.center_point.coordinates[1], lng: area.center_point.coordinates[0] }
      : undefined,
  }));
}
```

### 4. PostgreSQL Functions (SQL)

```sql
-- Function: Insert radius-based service area
CREATE OR REPLACE FUNCTION insert_radius_service_area(
  p_agent_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC,
  p_is_primary BOOLEAN DEFAULT false
)
RETURNS UUID
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO agent_service_areas (
    agent_id,
    area_type,
    center_point,
    radius_km,
    is_primary
  ) VALUES (
    p_agent_id,
    'radius',
    ST_MakePoint(p_lng, p_lat)::geography,
    p_radius_km,
    p_is_primary
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Find agents serving location (comprehensive)
CREATE OR REPLACE FUNCTION find_agents_serving_location(
  search_lat NUMERIC,
  search_lng NUMERIC,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  agent_id UUID,
  agent_name VARCHAR,
  agent_email VARCHAR,
  distance_km NUMERIC,
  service_area_type VARCHAR,
  is_primary_area BOOLEAN
)
AS $$
BEGIN
  RETURN QUERY
  WITH search_point AS (
    SELECT ST_MakePoint(search_lng, search_lat)::geography AS geog
  )
  SELECT DISTINCT
    a.id AS agent_id,
    a.name AS agent_name,
    a.email AS agent_email,
    CASE
      WHEN sa.area_type = 'radius' THEN
        ROUND(CAST(ST_Distance(sa.center_point, sp.geog) / 1000 AS NUMERIC), 1)
      ELSE NULL
    END AS distance_km,
    sa.area_type AS service_area_type,
    sa.is_primary AS is_primary_area
  FROM agents a
  JOIN agent_service_areas sa ON a.id = sa.agent_id
  CROSS JOIN search_point sp
  WHERE
    -- Radius match
    (sa.area_type = 'radius' AND ST_DWithin(sa.center_point, sp.geog, sa.radius_km * 1000))
    OR
    -- Country-level match (matches all locations in country)
    (sa.area_type = 'country')
    -- Additional types (region, state, polygon) would be added here
  ORDER BY
    distance_km ASC NULLS LAST,
    sa.is_primary DESC,
    sa.priority ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Geocode location name to coordinates (using cached data)
CREATE OR REPLACE FUNCTION geocode_location_name(
  location_name VARCHAR
)
RETURNS TABLE (
  location_id UUID,
  name VARCHAR,
  lat NUMERIC,
  lng NUMERIC,
  full_path VARCHAR
)
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE location_path AS (
    -- Base case: the location itself
    SELECT
      l.id,
      l.name,
      l.parent_id,
      l.name AS path,
      ST_Y(l.coordinates::geometry) AS lat,
      ST_X(l.coordinates::geometry) AS lng,
      l.search_rank
    FROM locations l
    WHERE l.name ILIKE '%' || location_name || '%'

    UNION ALL

    -- Recursive case: parent locations
    SELECT
      lp.id,
      lp.name,
      p.parent_id,
      p.name || ', ' || lp.path AS path,
      lp.lat,
      lp.lng,
      lp.search_rank
    FROM location_path lp
    JOIN locations p ON p.id = lp.parent_id
  )
  SELECT
    lp.id AS location_id,
    lp.name,
    lp.lat,
    lp.lng,
    lp.path AS full_path
  FROM location_path lp
  WHERE lp.parent_id IS NULL -- Top-level only
  ORDER BY lp.search_rank DESC NULLS LAST
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Sources

This research document was compiled from the following sources:

### Real Estate Platforms
- [Redfin Vs. Zillow In 2026: Estimates, Accuracy & More](https://www.realestateskills.com/blog/redfin-vs-zillow)
- [Redfin vs Zillow: Which real estate website is king in 2026?](https://whop.com/blog/redfin-vs-zillow/)
- [Domain Real Estate & Property - Google Play](https://play.google.com/store/apps/details?id=com.fairfax.domain&hl=en)
- [realestate.com.au versus Domain: which site is best?](https://www.cubbi.com.au/blog/realestate-com-au-versus-domain-which-site-is-best-to-advertise-my-property)

### Global Platform Location Intelligence
- [How companies like Uber, Google and Airbnb Disrupt Industries with Location Intelligence](https://medium.com/@abhirup.acharya009/how-companies-like-uber-google-and-airbnb-disrupt-industries-with-location-intelligence-f4fb6ddc3808)
- [Localization Examples: What Airbnb and Uber Tell Us](https://phrase.com/blog/posts/localization-examples/)
- [Analyzing and predicting the spatial penetration of Airbnb](https://epjdatascience.springeropen.com/articles/10.1140/epjds/s13688-018-0156-6)

### Location APIs
- [Mapbox vs. Google Maps vs. OpenStreetMap APIs](https://relevant.software/blog/choosing-a-map-amapbox-google-maps-openstreetmap/)
- [Google Maps vs. Mapbox vs. OpenStreetMap Comparison](https://www.rst.software/blog/google-maps-vs-mapbox-vs-openstreetmap-which-map-api-should-you-choose-and-why)
- [Guide To Geocoding API Pricing - January 9, 2026](https://mapscaping.com/guide-to-geocoding-api-pricing/)
- [Geocoding APIs compared: Pricing, free tiers & terms of use](https://www.bitoff.org/geocoding-apis-comparison/)
- [Azure Maps Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-maps/)
- [HERE Base Plan Pricing](https://www.here.com/get-started/pricing)

### PostGIS & Geospatial Database
- [PostGIS Data Management](https://postgis.net/docs/using_postgis_dbmanagement.html)
- [Geographical Data Storage with PostGIS and Polygons](https://www.open200.com/post/geographical-data-storage-and-analysis-with-postgis-and-polygons-in-postgresql)
- [10 PostGIS Best Practices](https://climbtheladder.com/10-postgis-best-practices/)
- [PostGIS vs MongoDB Geospatial Comparison](https://stackshare.io/stackups/mongodb-vs-postgis)
- [Performance analysis of MongoDB versus PostGIS](https://link.springer.com/article/10.1007/s41324-016-0059-1)

### UX Best Practices
- [Autocomplete suggestions: varieties, benefits & UX best practices](https://www.freshconsulting.com/insights/blog/autocomplete-benefits-ux-best-practices/)
- [9 UX Best Practice Design Patterns for Autocomplete](https://baymard.com/blog/autocomplete-design)
- [Address autocomplete best practices](https://www.smarty.com/blog/address-autocomplete-best-practices)
- [Maps and Location Finders on Mobile Devices](https://www.nngroup.com/articles/mobile-maps-locations/)
- [Mobile Search UX & Design Best Practices](https://evinent.com/blog/mobile-search-ux-ui)
- [Designing a Progressive Location Filter](https://uxbooth.com/articles/designing-a-progressive-location-filter/)
- [Real estate UX/UI Design: 11 Best Practices](https://aspirity.com/blog/best-practices-real-estate)

### Service Area Design
- [Location Measurement: Radius vs Polygons](https://www.linkedin.com/pulse/location-measurement-radius-vs-polygons-which-best-ryan-mcclelland)
- [Top Use Cases for Polygon Data](https://www.safegraph.com/events/top-use-cases-for-polygon-data)
- [What Is Polygoning? Digitally Target Your Customers](https://adaptmedia.com/what-is-polygoning/)

### Database Schema
- [Real Estate Agency Data Model | Vertabelo](https://vertabelo.com/blog/managing-houses-and-properties-a-real-estate-agency-data-model/)
- [Real Estate Database Structure and Schema](https://databasesample.com/database/real-estate-database)
- [Database design for country, state, city hierarchy](https://www.sitepoint.com/community/t/database-best-practice-for-region-information/107690)

### Caching Strategies
- [CDN Caching Overview | Google Cloud](https://cloud.google.com/cdn/docs/caching)
- [Best Practices for Caching Strategies with Fastly CDN](https://loadforge.com/guides/caching-strategies-with-fastly-cdn-best-practices)
- [A deep dive into caching strategies for CDN optimization](https://www.revolgy.com/insights/blog/deep-dive-into-caching-strategies-for-cdn-optimization)

### Location Data Sources
- [GeoNames Web Service Documentation](http://www.geonames.org/export/web-services.html)
- [GeoNames Alternative | Verified Location Data](https://www.geopostcodes.com/geonames-alternative/)
- [Top 7 Open-Source Location Data Databases](https://www.geopostcodes.com/blog/open-source-location-data/)

### Map Libraries
- [Leaflet Quick Start Guide](https://leafletjs.com/examples/quick-start/)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Leaflet or Mapbox? Choosing the Right Tool](https://medium.com/visarsoft-blog/leaflet-or-mapbox-choosing-the-right-tool-for-interactive-maps-53dea7cc3c40)

---

**End of Research Document**

*This document provides production-ready research and recommendations for implementing a global location/geography system for agent service areas on the Agent Network Hub platform. All recommendations are based on industry best practices, real-world examples, and technical feasibility analysis.*
