import { Badge } from "@/components/ui/badge";

export default function ConversationStateBadge({ state }) {
  const getStateConfig = (state) => {
    switch (state) {
      case "confirmed":
        return { label: "Confirmed", className: "bg-success/15 text-success border-success/30" };
      case "awaiting_property_id":
        return { label: "Awaiting Property ID", className: "bg-warning/15 text-warning border-warning/30" };
      case "awaiting_confirmation":
        return { label: "Awaiting Confirmation", className: "bg-secondary/15 text-secondary-foreground border-secondary/30" };
      default:
        return { label: state || "Unknown", className: "bg-muted text-muted-foreground border-border" };
    }
  };

  const config = getStateConfig(state);

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
