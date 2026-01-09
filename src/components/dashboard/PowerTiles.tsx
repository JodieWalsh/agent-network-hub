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
      className="group p-5 rounded-md border border-border bg-white hover:border-forest/30 transition-colors duration-150 text-left w-full"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-forest/5 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-forest" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1 text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">
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
