import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, CheckCircle, Clock } from "lucide-react";

export default function ConversationStats({ aggregates }) {
  const {
    total = 0,
    confirmed = 0,
    activeToday = 0,
    topIntent = null,
  } = aggregates || {};

  const stats = [
    {
      title: "Total Conversations",
      value: total,
      icon: MessageSquare,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Confirmed Properties",
      value: confirmed,
      icon: CheckCircle,
      tone: "bg-success/15 text-success",
    },
    {
      title: "Active Today",
      value: activeToday,
      icon: Clock,
      tone: "bg-warning/15 text-warning",
    },
    {
      title: "Top Intent",
      value: topIntent ? topIntent.substring(0, 18) : "N/A",
      icon: Users,
      tone: "bg-secondary/15 text-secondary-foreground",
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
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-heading mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.tone} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
