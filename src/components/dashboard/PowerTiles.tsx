import { Building2, ClipboardCheck, FileText } from "lucide-react";
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
      className="group w-full min-h-[44px] rounded-[20px] border border-white/60 p-6 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16),0_6px_16px_rgba(94,70,55,0.1)] hover:shadow-[0_4px_8px_rgba(94,70,55,0.1),0_32px_68px_-8px_rgba(183,110,121,0.38),0_18px_44px_rgba(140,95,70,0.2),0_8px_20px_rgba(94,70,55,0.12)]"
      style={{
        background:
          "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 55%, rgba(246,241,234,0.68) 100%)",
        borderTop: "1px solid rgba(183,110,121,0.3)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2D6350]/8 transition-colors group-hover:bg-[#B76E79]/12">
          <Icon size={18} className="text-[#2D6350] transition-colors group-hover:text-[#B76E79]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-base font-semibold text-[#173A31]">
            {title}
          </h3>
          <p className="text-sm text-[#1C1917]">
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
    <div className="grid gap-5 md:grid-cols-3">
      {tiles.map((tile) => (
        <PowerTile key={tile.title} {...tile} />
      ))}
    </div>
  );
}
