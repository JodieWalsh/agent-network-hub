/**
 * ServiceAreaManager Component
 *
 * Allows agents to manage their service areas:
 * - Radius-based (e.g., "50km from Sydney CBD")
 * - Region-based (e.g., "Eastern Suburbs, Sydney")
 * - State-level (e.g., "Anywhere in NSW")
 * - Country-level (e.g., "Anywhere in Australia")
 * - Global (e.g., "Anywhere in the world")
 *
 * Supports multiple service areas per agent
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSearch, type LocationSearchProps } from '@/components/location/LocationSearch';
import { MapPin, Plus, X, Globe2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { LocationSuggestion } from '@/lib/mapbox-geocoder';

export interface ServiceArea {
  id?: string;
  area_type: 'radius' | 'region' | 'state' | 'country' | 'global';
  center_point?: { lat: number; lng: number };
  center_name?: string;
  radius_km?: number;
  region_name?: string;
  state_code?: string;
  state_name?: string;
  country_code?: string;
  country_name?: string;
  is_primary: boolean;
  priority: number;
}

interface ServiceAreaManagerProps {
  userId: string;
  initialAreas?: ServiceArea[];
  onChange?: (areas: ServiceArea[]) => void;
}

// Popular countries (shown first)
const POPULAR_COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'NZ', name: 'New Zealand' },
];

// All countries (ISO 3166-1 alpha-2) - alphabetically sorted
const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'CD', name: 'Democratic Republic of the Congo' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'CI', name: 'Ivory Coast' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

// States/Provinces/Regions by Country (major countries with admin divisions)
const STATES_BY_COUNTRY: Record<string, Array<{ code: string; name: string }>> = {
  AU: [ // Australia - States & Territories
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NT', name: 'Northern Territory' },
  ],
  US: [ // United States - 50 States
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
  ],
  CA: [ // Canada - Provinces & Territories
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'YT', name: 'Yukon' },
  ],
  GB: [ // United Kingdom - Countries
    { code: 'ENG', name: 'England' },
    { code: 'SCT', name: 'Scotland' },
    { code: 'WLS', name: 'Wales' },
    { code: 'NIR', name: 'Northern Ireland' },
  ],
  NZ: [ // New Zealand - Regions
    { code: 'AUK', name: 'Auckland' },
    { code: 'BOP', name: 'Bay of Plenty' },
    { code: 'CAN', name: 'Canterbury' },
    { code: 'GIS', name: 'Gisborne' },
    { code: 'HKB', name: "Hawke's Bay" },
    { code: 'MWT', name: 'Manawatū-Whanganui' },
    { code: 'MBH', name: 'Marlborough' },
    { code: 'NSN', name: 'Nelson' },
    { code: 'NTL', name: 'Northland' },
    { code: 'OTA', name: 'Otago' },
    { code: 'STL', name: 'Southland' },
    { code: 'TKI', name: 'Taranaki' },
    { code: 'TAS', name: 'Tasman' },
    { code: 'WKO', name: 'Waikato' },
    { code: 'WGN', name: 'Wellington' },
    { code: 'WTC', name: 'West Coast' },
  ],
  DE: [ // Germany - Bundesländer (States)
    { code: 'BW', name: 'Baden-Württemberg' },
    { code: 'BY', name: 'Bavaria (Bayern)' },
    { code: 'BE', name: 'Berlin' },
    { code: 'BB', name: 'Brandenburg' },
    { code: 'HB', name: 'Bremen' },
    { code: 'HH', name: 'Hamburg' },
    { code: 'HE', name: 'Hesse (Hessen)' },
    { code: 'MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'NI', name: 'Lower Saxony (Niedersachsen)' },
    { code: 'NW', name: 'North Rhine-Westphalia (Nordrhein-Westfalen)' },
    { code: 'RP', name: 'Rhineland-Palatinate (Rheinland-Pfalz)' },
    { code: 'SL', name: 'Saarland' },
    { code: 'SN', name: 'Saxony (Sachsen)' },
    { code: 'ST', name: 'Saxony-Anhalt (Sachsen-Anhalt)' },
    { code: 'SH', name: 'Schleswig-Holstein' },
    { code: 'TH', name: 'Thuringia (Thüringen)' },
  ],
  FR: [ // France - Régions
    { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
    { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
    { code: 'BRE', name: 'Brittany (Bretagne)' },
    { code: 'CVL', name: 'Centre-Val de Loire' },
    { code: 'COR', name: 'Corsica (Corse)' },
    { code: 'GES', name: 'Grand Est' },
    { code: 'HDF', name: 'Hauts-de-France' },
    { code: 'IDF', name: 'Île-de-France' },
    { code: 'NOR', name: 'Normandy (Normandie)' },
    { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
    { code: 'OCC', name: 'Occitanie' },
    { code: 'PDL', name: 'Pays de la Loire' },
    { code: 'PAC', name: "Provence-Alpes-Côte d'Azur" },
  ],
  IN: [ // India - States (major ones)
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CG', name: 'Chhattisgarh' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JK', name: 'Jammu and Kashmir' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OR', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UT', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' },
  ],
  BR: [ // Brazil - States
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Federal District (Distrito Federal)' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' },
  ],
  MX: [ // Mexico - States
    { code: 'AG', name: 'Aguascalientes' },
    { code: 'BC', name: 'Baja California' },
    { code: 'BS', name: 'Baja California Sur' },
    { code: 'CM', name: 'Campeche' },
    { code: 'CS', name: 'Chiapas' },
    { code: 'CH', name: 'Chihuahua' },
    { code: 'CO', name: 'Coahuila' },
    { code: 'CL', name: 'Colima' },
    { code: 'DF', name: 'Mexico City (Ciudad de México)' },
    { code: 'DG', name: 'Durango' },
    { code: 'GT', name: 'Guanajuato' },
    { code: 'GR', name: 'Guerrero' },
    { code: 'HG', name: 'Hidalgo' },
    { code: 'JA', name: 'Jalisco' },
    { code: 'ME', name: 'State of Mexico (México)' },
    { code: 'MI', name: 'Michoacán' },
    { code: 'MO', name: 'Morelos' },
    { code: 'NA', name: 'Nayarit' },
    { code: 'NL', name: 'Nuevo León' },
    { code: 'OA', name: 'Oaxaca' },
    { code: 'PU', name: 'Puebla' },
    { code: 'QE', name: 'Querétaro' },
    { code: 'QR', name: 'Quintana Roo' },
    { code: 'SL', name: 'San Luis Potosí' },
    { code: 'SI', name: 'Sinaloa' },
    { code: 'SO', name: 'Sonora' },
    { code: 'TB', name: 'Tabasco' },
    { code: 'TM', name: 'Tamaulipas' },
    { code: 'TL', name: 'Tlaxcala' },
    { code: 'VE', name: 'Veracruz' },
    { code: 'YU', name: 'Yucatán' },
    { code: 'ZA', name: 'Zacatecas' },
  ],
};

export function ServiceAreaManager({ userId, initialAreas = [], onChange }: ServiceAreaManagerProps) {
  const [areas, setAreas] = useState<ServiceArea[]>(initialAreas);
  const [isAdding, setIsAdding] = useState(false);
  const [newAreaType, setNewAreaType] = useState<ServiceArea['area_type']>('radius');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [radius, setRadius] = useState(25);
  const [selectedCountry, setSelectedCountry] = useState('AU'); // For entire country selection
  const [selectedStateCountry, setSelectedStateCountry] = useState('AU'); // For state/province country selection
  const [selectedState, setSelectedState] = useState('');
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null); // Track last added area for success message

  // Load existing service areas
  useEffect(() => {
    loadServiceAreas();
  }, [userId]);

  const loadServiceAreas = async () => {
    const { data, error } = await supabase
      .from('agent_service_areas')
      .select('*')
      .eq('agent_id', userId)
      .order('is_primary', { ascending: false })
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error loading service areas:', error);
      return;
    }

    if (data) {
      const formattedAreas: ServiceArea[] = data.map(area => ({
        ...area,
        center_point: area.center_point
          ? {
              // PostGIS returns geography as GeoJSON-like object
              lat: (area.center_point as any).coordinates?.[1] || 0,
              lng: (area.center_point as any).coordinates?.[0] || 0,
            }
          : undefined,
      }));
      setAreas(formattedAreas);
      onChange?.(formattedAreas);
    }
  };

  const handleAddArea = () => {
    setIsAdding(true);
    setSelectedLocation(null);
    setRadius(25);
    setSelectedStateCountry('AU'); // Reset to default
    setSelectedState('');
  };

  const handleSaveNewArea = async () => {
    let newArea: Partial<ServiceArea> = {
      area_type: newAreaType,
      is_primary: areas.length === 0, // First area is primary
      priority: areas.length + 1,
    };

    // Validate and build area data based on type
    switch (newAreaType) {
      case 'radius':
        if (!selectedLocation) {
          toast.error('Please select a location for the radius center');
          return;
        }
        newArea = {
          ...newArea,
          center_point: selectedLocation.coordinates,
          center_name: selectedLocation.fullName,
          radius_km: radius,
        };
        break;

      case 'region':
        if (!selectedLocation) {
          toast.error('Please select a region');
          return;
        }
        newArea = {
          ...newArea,
          region_name: selectedLocation.fullName,
        };
        break;

      case 'state':
        if (!selectedState) {
          toast.error('Please select a state/province');
          return;
        }
        const stateList = STATES_BY_COUNTRY[selectedStateCountry];
        const state = stateList?.find(s => s.code === selectedState);
        const stateCountry = ALL_COUNTRIES.find(c => c.code === selectedStateCountry);
        newArea = {
          ...newArea,
          state_code: selectedState,
          state_name: state?.name,
          country_code: selectedStateCountry,
          country_name: stateCountry?.name,
        };
        break;

      case 'country':
        const country = ALL_COUNTRIES.find(c => c.code === selectedCountry);
        newArea = {
          ...newArea,
          country_code: selectedCountry,
          country_name: country?.name,
        };
        break;

      case 'global':
        newArea = {
          ...newArea,
        };
        break;
    }

    // Save to database
    setSaving(true);
    try {
      let insertData: any = {
        agent_id: userId,
        area_type: newArea.area_type,
        is_primary: newArea.is_primary,
        priority: newArea.priority,
      };

      if (newAreaType === 'radius' && newArea.center_point) {
        // Use the helper function to insert radius-based area
        const { data, error } = await supabase.rpc('insert_radius_service_area', {
          p_agent_id: userId,
          p_center_name: newArea.center_name!,
          p_lat: newArea.center_point.lat,
          p_lng: newArea.center_point.lng,
          p_radius_km: newArea.radius_km!,
          p_is_primary: newArea.is_primary!,
          p_priority: newArea.priority!,
        });

        if (error) throw error;
      } else {
        // Insert other types directly
        if (newAreaType === 'region') {
          insertData.region_name = newArea.region_name;
        } else if (newAreaType === 'state') {
          insertData.state_code = newArea.state_code;
          insertData.state_name = newArea.state_name;
          insertData.country_code = newArea.country_code;
          insertData.country_name = newArea.country_name;
        } else if (newAreaType === 'country') {
          insertData.country_code = newArea.country_code;
          insertData.country_name = newArea.country_name;
        }

        const { error } = await supabase
          .from('agent_service_areas')
          .insert(insertData);

        if (error) throw error;
      }

      // Smart flow: For state and country types, keep form open for adding more
      const displayName = getAreaDisplayName(newArea as ServiceArea);

      if (newAreaType === 'state' || newAreaType === 'country') {
        // Keep form open, show success message, offer to add another
        setJustAdded(displayName);

        // Reset only the selection, keep country (for states) and area type
        if (newAreaType === 'state') {
          setSelectedState(''); // Clear state selection, keep country
        } else if (newAreaType === 'country') {
          setSelectedCountry('AU'); // Reset to default for next country selection
        }

        await loadServiceAreas();
        toast.success(`Added: ${displayName}`);
      } else {
        // For other types (radius, region, global), close form as before
        toast.success('Service area added successfully');
        await loadServiceAreas();
        setIsAdding(false);
        setJustAdded(null);
      }
    } catch (error: any) {
      console.error('Error saving service area:', error);
      toast.error('Failed to save service area: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    // Clear the just added message and reset for next entry
    setJustAdded(null);
    // Keep the form open, keep the area type and country (for states)
  };

  const handleDone = () => {
    // Close the form completely
    setIsAdding(false);
    setJustAdded(null);
    setSelectedState('');
    setSelectedCountry('AU');
    setSelectedStateCountry('AU');
  };

  const handleDeleteArea = async (areaId: string) => {
    const { error } = await supabase
      .from('agent_service_areas')
      .delete()
      .eq('id', areaId);

    if (error) {
      console.error('Error deleting service area:', error);
      toast.error('Failed to delete service area');
      return;
    }

    toast.success('Service area removed');
    await loadServiceAreas();
  };

  const getAreaDisplayName = (area: ServiceArea): string => {
    switch (area.area_type) {
      case 'radius':
        return `${area.radius_km}km from ${area.center_name}`;
      case 'region':
        return area.region_name || 'Region';
      case 'state':
        return `Anywhere in ${area.state_name}`;
      case 'country':
        return `Anywhere in ${area.country_name}`;
      case 'global':
        return 'Anywhere in the world';
      default:
        return 'Unknown';
    }
  };

  const getAreaTypeLabel = (type: ServiceArea['area_type']): string => {
    switch (type) {
      case 'radius': return 'Radius';
      case 'region': return 'Region';
      case 'state': return 'State';
      case 'country': return 'Country';
      case 'global': return 'Global';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Areas</CardTitle>
        <CardDescription>
          Specify where you're willing to work. You can add multiple areas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Service Areas */}
        {areas.length > 0 && (
          <div className="space-y-2">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3 flex-1">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {getAreaDisplayName(area)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getAreaTypeLabel(area.area_type)}
                      </Badge>
                      {area.is_primary && (
                        <Badge variant="secondary" className="text-xs bg-forest/10 text-forest">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteArea(area.id!)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Area Form */}
        {isAdding ? (
          <div className="space-y-4 p-4 rounded-md border border-border bg-muted/20">
            <div className="space-y-2">
              <label className="text-sm font-medium">Area Type</label>
              <Select value={newAreaType} onValueChange={(value: any) => setNewAreaType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radius">Radius from location</SelectItem>
                  <SelectItem value="region">Specific region/city</SelectItem>
                  <SelectItem value="state">Entire state</SelectItem>
                  <SelectItem value="country">Entire country</SelectItem>
                  <SelectItem value="global">Anywhere in the world</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Radius Type */}
            {newAreaType === 'radius' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Center Location</label>
                  <LocationSearch
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder="Search for a location worldwide..."
                    allowGeolocation
                    // No country restriction - global platform!
                  />
                </div>
                {selectedLocation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Radius</label>
                      <span className="text-sm font-semibold text-forest">{radius} km</span>
                    </div>
                    <Slider
                      value={[radius]}
                      onValueChange={(value) => setRadius(value[0])}
                      min={5}
                      max={250}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5 km</span>
                      <span>125 km</span>
                      <span>250 km</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Region Type */}
            {newAreaType === 'region' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Region or City</label>
                <LocationSearch
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Search for a region or city worldwide..."
                  types={['place', 'locality', 'region']}
                  // No country restriction - global platform!
                />
              </div>
            )}

            {/* State Type */}
            {newAreaType === 'state' && (
              <>
                {/* Step 1: Select Country */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Select
                    value={selectedStateCountry}
                    onValueChange={(value) => {
                      setSelectedStateCountry(value);
                      setSelectedState(''); // Reset state when country changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* Show only countries that have states/provinces data */}
                      {Object.keys(STATES_BY_COUNTRY)
                        .map(code => ALL_COUNTRIES.find(c => c.code === code))
                        .filter(Boolean)
                        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
                        .map(country => (
                          <SelectItem key={country!.code} value={country!.code}>
                            {country!.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(STATES_BY_COUNTRY).length} countries with states/provinces available
                  </p>
                </div>

                {/* Step 2: Select State/Province (appears after country selected) */}
                {selectedStateCountry && STATES_BY_COUNTRY[selectedStateCountry] && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      State/Province/Region
                    </label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a state/province" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {STATES_BY_COUNTRY[selectedStateCountry].map(state => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {STATES_BY_COUNTRY[selectedStateCountry].length} available
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Country Type */}
            {newAreaType === 'country' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {/* Popular countries first */}
                    {POPULAR_COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-border my-1" />

                    {/* All other countries (excluding popular ones already shown) */}
                    {ALL_COUNTRIES
                      .filter(country => !POPULAR_COUNTRIES.some(p => p.code === country.code))
                      .map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose your country - all {ALL_COUNTRIES.length} countries available
                </p>
              </div>
            )}

            {/* Global Type */}
            {newAreaType === 'global' && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <Globe2 className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You'll be shown for all location searches worldwide
                </p>
              </div>
            )}

            {/* Success Message & Add Another (for state and country types) */}
            {justAdded && (newAreaType === 'state' || newAreaType === 'country') && (
              <div className="space-y-3 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 dark:text-green-400 mt-0.5">✓</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Added: {justAdded}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {newAreaType === 'state'
                        ? `Add another state in ${ALL_COUNTRIES.find(c => c.code === selectedStateCountry)?.name}?`
                        : 'Add another country?'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleAddAnother}
                    className="flex-1"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {newAreaType === 'state' ? 'Add Another State' : 'Add Another Country'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDone}
                    size="sm"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Normal Actions (when not showing success message) */}
            {!justAdded && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveNewArea}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Add Service Area'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setJustAdded(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddArea}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service Area
          </Button>
        )}

        {/* Empty State */}
        {areas.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No service areas added yet</p>
            <p className="text-xs mt-1">Add at least one area to help clients find you</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
