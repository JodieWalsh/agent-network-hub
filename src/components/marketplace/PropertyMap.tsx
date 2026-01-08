import { MapPin } from "lucide-react";

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyTitle: string;
  address?: string;
}

export function PropertyMap({ latitude, longitude, propertyTitle, address }: PropertyMapProps) {
  // OpenStreetMap embed URL
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;

  // Link to open in full map
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;

  return (
    <div className="space-y-4">
      {/* Address Display */}
      {address && (
        <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
          <MapPin size={18} className="text-forest flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium">Property Location</div>
            <div className="text-sm text-muted-foreground">{address}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map */}
      <div className="relative w-full h-96 rounded-lg overflow-hidden border border-border">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          title={`Map showing location of ${propertyTitle}`}
          className="w-full h-full"
        />
      </div>

      {/* View Full Map Link */}
      <div className="flex justify-end">
        <a
          href={fullMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-forest hover:underline flex items-center gap-1"
        >
          View larger map
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 1L1 10M10 1H3M10 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      {/* Map Attribution */}
      <div className="text-xs text-muted-foreground text-center">
        Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}
