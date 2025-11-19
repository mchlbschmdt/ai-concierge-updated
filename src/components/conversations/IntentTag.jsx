import { Wifi, Car, Clock, MapPin, Utensils, HelpCircle, Info, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function IntentTag({ intent }) {
  if (!intent) {
    return (
      <Badge variant="outline" className="bg-gray-soft text-gray-dark">
        <HelpCircle className="mr-1 h-3 w-3" />
        No intent
      </Badge>
    );
  }

  const getIntentConfig = (intent) => {
    const intentLower = intent.toLowerCase();

    if (intentLower.includes("wifi") || intentLower.includes("password") || intentLower.includes("network")) {
      return { icon: Wifi, label: "WiFi", color: "bg-secondary text-white" };
    }
    if (intentLower.includes("parking") || intentLower.includes("car")) {
      return { icon: Car, label: "Parking", color: "bg-primary text-white" };
    }
    if (intentLower.includes("checkin") || intentLower.includes("checkout") || intentLower.includes("time")) {
      return { icon: Clock, label: "Check-in/out", color: "bg-accent text-white" };
    }
    if (intentLower.includes("direction") || intentLower.includes("location") || intentLower.includes("address")) {
      return { icon: MapPin, label: "Directions", color: "bg-primary text-white" };
    }
    if (
      intentLower.includes("restaurant") ||
      intentLower.includes("food") ||
      intentLower.includes("coffee") ||
      intentLower.includes("dining") ||
      intentLower.includes("breakfast") ||
      intentLower.includes("lunch") ||
      intentLower.includes("dinner")
    ) {
      return { icon: Utensils, label: "Recommendations", color: "bg-success text-white" };
    }
    if (intentLower.includes("amenity") || intentLower.includes("amenities") || intentLower.includes("facilities")) {
      return { icon: Home, label: "Amenities", color: "bg-secondary text-white" };
    }
    if (intentLower.includes("general") || intentLower.includes("info")) {
      return { icon: Info, label: "General Info", color: "bg-gray-dark text-white" };
    }

    return { icon: HelpCircle, label: intent.substring(0, 20), color: "bg-gray-soft text-gray-dark" };
  };

  const config = getIntentConfig(intent);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
