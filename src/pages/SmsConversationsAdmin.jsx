import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Download, RefreshCw } from "lucide-react";
import ConversationStateBadge from "@/components/conversations/ConversationStateBadge";
import IntentTag from "@/components/conversations/IntentTag";
import ConversationStats from "@/components/conversations/ConversationStats";
import ConversationFilters from "@/components/conversations/ConversationFilters";
import ConversationDetailModal from "@/components/conversations/ConversationDetailModal";
import QuickSmsTest from "@/components/QuickSmsTest";
import { formatDistanceToNow } from "date-fns";

export default function SmsConversationsAdmin() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    dateRange: "7days",
    propertyId: null,
    states: [],
    intentTypes: [],
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      subscribeToChanges();
    }
  }, [currentUser, page, filters]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sms_conversations")
        .select(`
          *,
          properties:properties!left(property_name, address, code)
        `, { count: "exact" })
        .order("last_interaction_timestamp", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Apply filters
      if (filters.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }
      if (filters.states.length > 0) {
        query = query.in("conversation_state", filters.states);
      }
      if (searchQuery) {
        query = query.or(`phone_number.ilike.%${searchQuery}%,last_intent.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setConversations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading conversations:", error);
      showToast("Failed to load conversations", "error");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel("sms_conversations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sms_conversations",
        },
        (payload) => {
          console.log("Conversation update:", payload);
          loadConversations();
          if (payload.eventType === "INSERT") {
            showToast("New conversation started", "info");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Phone", "Property", "State", "Intent", "Response Preview", "Last Interaction"],
      ...conversations.map((conv) => [
        conv.phone_number,
        conv.properties?.property_name || conv.property_id || "N/A",
        conv.conversation_state,
        conv.last_intent || "N/A",
        conv.last_response ? conv.last_response.substring(0, 100) + "..." : "N/A",
        conv.last_interaction_timestamp || "N/A",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-conversations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("Exported conversations to CSV", "success");
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-heading">SMS Conversations</h1>
            <p className="text-gray-dark mt-1">Monitor and analyze guest conversations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadConversations} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <ConversationStats conversations={conversations} />

        <QuickSmsTest />

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-dark h-4 w-4" />
                <Input
                  placeholder="Search by phone number or intent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ConversationFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-dark mt-4">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-dark text-lg">No conversations found</p>
                <p className="text-gray-dark text-sm mt-2">
                  Conversations will appear here when guests start chatting with your properties
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-soft">
                      <th className="text-left p-3 font-semibold text-heading">Phone</th>
                      <th className="text-left p-3 font-semibold text-heading">Property</th>
                      <th className="text-left p-3 font-semibold text-heading">State</th>
                      <th className="text-left p-3 font-semibold text-heading">Last Intent</th>
                      <th className="text-left p-3 font-semibold text-heading">Last Response</th>
                      <th className="text-left p-3 font-semibold text-heading">Last Active</th>
                      <th className="text-left p-3 font-semibold text-heading">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conv) => (
                      <tr
                        key={conv.id}
                        className="border-b border-gray-soft hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <td className="p-3">
                          <span className="font-mono text-sm">{formatPhoneNumber(conv.phone_number)}</span>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-heading">
                              {conv.properties?.property_name || conv.property_id || "N/A"}
                            </p>
                            {conv.properties?.address && (
                              <p className="text-sm text-gray-dark">{conv.properties.address}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <ConversationStateBadge state={conv.conversation_state} />
                        </td>
                        <td className="p-3">
                          <IntentTag intent={conv.last_intent} />
                        </td>
                        <td className="p-3 max-w-md">
                          <p className="text-sm text-gray-dark truncate">
                            {conv.last_response || "No response yet"}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-dark">
                            {conv.last_interaction_timestamp
                              ? formatDistanceToNow(new Date(conv.last_interaction_timestamp), {
                                  addSuffix: true,
                                })
                              : "N/A"}
                          </span>
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversation(conv);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-dark">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedConversation && (
          <ConversationDetailModal
            conversation={selectedConversation}
            onClose={() => setSelectedConversation(null)}
            onRefresh={loadConversations}
          />
        )}
      </div>
    </Layout>
  );
}
