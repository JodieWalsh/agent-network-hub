import { Building2, ClipboardCheck, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PowerTileProps {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
  delay?: string;
}

function PowerTile({
  icon: Icon,
  title,
  description,
  gradient,
  iconBg,
  delay = "0",
}: PowerTileProps) {
  return (
    <button
      className={cn(
        "power-tile text-left group opacity-0 animate-fade-in",
        gradient
      )}
      style={{ animationDelay: delay }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-current transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-current transform -translate-x-12 translate-y-12" />
      </div>

      {/* Content */}
      <div className="relative">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
            iconBg
          )}
        >
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-serif font-semibold mb-2">{title}</h3>
        <p className="text-sm opacity-80 mb-4 leading-relaxed">{description}</p>
        <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all duration-300">
          Get Started
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

const tiles = [
  {
    icon: Building2,
    title: "Browse Off-Market Properties",
    description: "Discover exclusive listings shared by verified agents in your network.",
    gradient: "bg-gradient-to-br from-forest to-forest-dark text-primary-foreground",
    iconBg: "bg-rose-gold text-forest",
  },
  {
    icon: ClipboardCheck,
    title: "Post Inspection Request",
    description: "Request property inspections from trusted local agents across Australia.",
    gradient: "bg-gradient-to-br from-rose-gold to-rose-gold-dark text-forest",
    iconBg: "bg-forest text-primary-foreground",
  },
  {
    icon: FileText,
    title: "Create Client Brief",
    description: "Build detailed property requirements to match with perfect listings.",
    gradient: "bg-gradient-to-br from-burgundy to-purple-900 text-primary-foreground",
    iconBg: "bg-rose-gold-light text-burgundy",
  },
];

export function PowerTiles() {
  return (
    <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
      {tiles.map((tile, index) => (
        <PowerTile key={tile.title} {...tile} delay={`${200 + index * 100}ms`} />
      ))}
    </div>
  );
}
