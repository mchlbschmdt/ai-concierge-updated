import { Wifi, Car, Clock, MapPin, Utensils, HelpCircle, Info, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function IntentTag({ intent }) {
  if (!intent) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
        <HelpCircle className="mr-1 h-3 w-3" />
        No intent
      </Badge>
    );
  }

  const getIntentConfig = (intent) => {
    const l = intent.toLowerCase();
    if (l.includes("wifi") || l.includes("password") || l.includes("network"))
      return { icon: Wifi, label: "WiFi", tone: "bg-secondary/15 text-secondary-foreground border-secondary/30" };
    if (l.includes("parking") || l.includes("car"))
      return { icon: Car, label: "Parking", tone: "bg-primary/10 text-primary border-primary/30" };
    if (l.includes("checkin") || l.includes("checkout") || l.includes("time"))
      return { icon: Clock, label: "Check-in/out", tone: "bg-accent/15 text-accent-foreground border-accent/30" };
    if (l.includes("direction") || l.includes("location") || l.includes("address"))
      return { icon: MapPin, label: "Directions", tone: "bg-primary/10 text-primary border-primary/30" };
    if (l.includes("restaurant") || l.includes("food") || l.includes("coffee") || l.includes("dining") || l.includes("breakfast") || l.includes("lunch") || l.includes("dinner"))
      return { icon: Utensils, label: "Recommendations", tone: "bg-success/15 text-success border-success/30" };
    if (l.includes("amenity") || l.includes("amenities") || l.includes("facilities"))
      return { icon: Home, label: "Amenities", tone: "bg-secondary/15 text-secondary-foreground border-secondary/30" };
    if (l.includes("general") || l.includes("info"))
      return { icon: Info, label: "General Info", tone: "bg-muted text-muted-foreground border-border" };
    return { icon: HelpCircle, label: intent.substring(0, 20), tone: "bg-muted text-muted-foreground border-border" };
  };

  const config = getIntentConfig(intent);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.tone}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
