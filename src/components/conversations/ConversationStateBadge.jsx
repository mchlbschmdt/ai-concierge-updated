import { Badge } from "@/components/ui/badge";

export default function ConversationStateBadge({ state }) {
  const getStateConfig = (state) => {
    switch (state) {
      case "confirmed":
        return {
          variant: "default",
          label: "Confirmed",
          className: "bg-success text-white",
        };
      case "awaiting_property_id":
        return {
          variant: "secondary",
          label: "Awaiting Property ID",
          className: "bg-warning text-white",
        };
      case "awaiting_confirmation":
        return {
          variant: "outline",
          label: "Awaiting Confirmation",
          className: "bg-secondary text-white",
        };
      default:
        return {
          variant: "outline",
          label: state || "Unknown",
          className: "bg-gray-soft text-gray-dark",
        };
    }
  };

  const config = getStateConfig(state);

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
