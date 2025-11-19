import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, CheckCircle, Clock } from "lucide-react";

export default function ConversationStats({ conversations }) {
  const totalConversations = conversations.length;
  const confirmedConversations = conversations.filter(
    (c) => c.conversation_state === "confirmed"
  ).length;
  const activeToday = conversations.filter((c) => {
    if (!c.last_interaction_timestamp) return false;
    const lastInteraction = new Date(c.last_interaction_timestamp);
    const today = new Date();
    return lastInteraction.toDateString() === today.toDateString();
  }).length;

  const intentCounts = {};
  conversations.forEach((conv) => {
    if (conv.last_intent) {
      intentCounts[conv.last_intent] = (intentCounts[conv.last_intent] || 0) + 1;
    }
  });
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    {
      title: "Total Conversations",
      value: totalConversations,
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-blue-50",
    },
    {
      title: "Confirmed Properties",
      value: confirmedConversations,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-green-50",
    },
    {
      title: "Active Today",
      value: activeToday,
      icon: Clock,
      color: "text-warning",
      bg: "bg-yellow-50",
    },
    {
      title: "Top Intent",
      value: topIntent ? topIntent[0].substring(0, 15) : "N/A",
      icon: Users,
      color: "text-secondary",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-dark font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-heading mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
