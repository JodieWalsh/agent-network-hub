import { Building2, ClipboardCheck, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PowerTileProps {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
}

function PowerTile({ icon: Icon, title, description, path }: PowerTileProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="group p-6 rounded-[18px] border border-rose-gold/15 bg-cream shadow-card hover:shadow-hover transition-all duration-200 text-left w-full"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-forest/10 flex items-center justify-center flex-shrink-0 group-hover:bg-forest/15 transition-colors">
          <Icon size={18} className="text-forest" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold mb-1 text-forest">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

const tiles = [
  {
    icon: Building2,
    title: "Browse Properties",
    description: "Exclusive off-market listings",
    path: "/marketplace",
  },
  {
    icon: ClipboardCheck,
    title: "Request Inspection",
    description: "Coordinate property inspections",
    path: "/inspections",
  },
  {
    icon: FileText,
    title: "Create Brief",
    description: "Build client requirements",
    path: "/briefs/new",
  },
];

export function PowerTiles() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {tiles.map((tile) => (
        <PowerTile key={tile.title} {...tile} />
      ))}
    </div>
  );
}
