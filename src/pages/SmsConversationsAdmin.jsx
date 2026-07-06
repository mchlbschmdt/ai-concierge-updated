import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  RefreshCw,
  MessageSquare,
  TestTube,
  History,
  AlertTriangle,
  Flame,
} from "lucide-react";
import ConversationStateBadge from "@/components/conversations/ConversationStateBadge";
import IntentTag from "@/components/conversations/IntentTag";
import ConversationStats from "@/components/conversations/ConversationStats";
import ConversationFilters from "@/components/conversations/ConversationFilters";
import ConversationDetailModal from "@/components/conversations/ConversationDetailModal";
import QuickSmsTest from "@/components/QuickSmsTest";
import PropertyComparisonTest from "@/components/PropertyComparisonTest";
import TestResultsHistory from "@/components/TestResultsHistory";
import { formatDistanceToNow } from "date-fns";

const ITEMS_PER_PAGE = 20;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

// Escape PostgREST .or() metacharacters
function escapeSearch(q) {
  return q.replace(/[%,()*"']/g, "");
}

function getDateRangeStart(range) {
  const now = new Date();
  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "7days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30days":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

const FALLBACK_MARKERS = [
  "I'm having a moment",
  "check with the host",
  "I'll check on that",
  "I don't have that information",
  "let me confirm that for you",
  "I still don't have specific information",
];

// Content that must never appear for properties outside Reunion Resort. If any
// last_response contains these tokens for a non-1434 property, the assistant
// leaked cross-property data and the row needs review.
const LEAKAGE_TOKENS = /reunion|titian|seven eagles|magic kingdom|epcot|disney springs|kissimmee/i;

// Phrasing that would imply the AI auto-approved a restricted request. These
// intents (early check-in / late checkout / bag drop) always require the host.
const RESTRICTED_INTENTS = new Set([
  "ask_early_checkin",
  "ask_late_checkout",
  "ask_bag_drop",
  "ask_baggage_hold",
]);
const APPROVAL_PHRASES = /\b(done|approved|confirmed|you'?re all set|all set)\b/i;

function isDataDumpy(response, intent) {
  if (!response) return false;
  const emojiCount = (response.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (response.length > 400) return true;
  if (emojiCount > 2) return true;
  if (intent === "ask_amenity" && /check-?in|check-?out|wifi.*parking/i.test(response)) return true;
  return false;
}

function needsReview(conv) {
  if (!conv.last_response) return true;
  return FALLBACK_MARKERS.some((m) => conv.last_response.toLowerCase().includes(m.toLowerCase()));
}

function isStale(conv) {
  if (conv.conversation_state !== "awaiting_property_id") return false;
  if (!conv.last_interaction_timestamp) return false;
  return Date.now() - new Date(conv.last_interaction_timestamp).getTime() > STALE_THRESHOLD_MS;
}

function hasLeakage(conv) {
  if (!conv.last_response) return false;
  // The one property that actually has this content is code '1434'. If the
  // property_id or code isn't 1434 and the response contains those tokens,
  // it's cross-property contamination.
  const isReunion = conv.property_id === "1434" || conv.properties?.code === "1434";
  if (isReunion) return false;
  return LEAKAGE_TOKENS.test(conv.last_response);
}

function isRestrictedAutoApproved(conv) {
  if (!conv.last_intent || !conv.last_response) return false;
  if (!RESTRICTED_INTENTS.has(conv.last_intent)) return false;
  return APPROVAL_PHRASES.test(conv.last_response);
}

// Fallback loop: the AI hedged ("let me confirm") without actually escalating.
// We look for the hedging phrasing and require that no handoff-ack language
// is present (which would indicate a real host escalation).
const FALLBACK_HEDGE = /want to make sure i give you the right info|let me confirm that for you/i;
const HANDOFF_ACK = /messaged your host|looped in your host|passed (this|it) along to your host|checking with (the )?host|reach out to the (host|property manager)|follow up (shortly|as soon)/i;
function hasUnhelpfulFallback(conv) {
  if (!conv.last_response) return false;
  if (!FALLBACK_HEDGE.test(conv.last_response)) return false;
  return !HANDOFF_ACK.test(conv.last_response);
}

// Hallucinated amenity: response affirms an amenity that the property record
// doesn't list. We only flag positive claims ("yes...pool", "there's a pool")
// so honest negatives ("no pool at this property") don't trigger it.
const AMENITY_POSITIVE = /(?:yes[^.]{0,40}|there(?:'s| is)[^.]{0,20}|has[^.]{0,20})\b(pool|hot tub|jacuzzi|grill|bbq)\b/i;
function hasHallucinatedAmenity(conv) {
  if (!conv.last_response) return false;
  const m = conv.last_response.match(AMENITY_POSITIVE);
  if (!m) return false;
  const claimed = m[1].toLowerCase();
  const raw = conv.properties?.amenities;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,;\n]/).map((s) => s.trim())
      : [];
  if (list.length === 0) return false; // unknown — don't flag
  const key = claimed === "bbq" ? "grill" : claimed === "jacuzzi" ? "hot tub" : claimed;
  return !list.some((a) => new RegExp(key, "i").test(String(a)));
}

// Closed venue: response mentions a business the model flagged as closed.
// These slip through when the LLM cites an outdated listing. Any hit is a red
// flag — guests should never be sent to a place that's shut down.
const CLOSED_VENUE = /\b(permanently closed|temporarily closed|closed for renovation|closed down|out of business|no longer (open|operating|in business))\b/i;
function hasClosedVenueMention(conv) {
  if (!conv.last_response) return false;
  return CLOSED_VENUE.test(conv.last_response);
}

// Positive signal: last recommendation was verified against Google Maps
// (business_status = OPERATIONAL + real travel distance from the property).
function isGoogleVerified(conv) {
  return !!conv?.conversation_context?.last_google_verified;
}




export default function SmsConversationsAdmin() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [aggregates, setAggregates] = useState({ total: 0, confirmed: 0, activeToday: 0, topIntent: null });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    dateRange: "7days",
    propertyId: null,
    states: [],
    intentTypes: [],
    reviewFilter: "all",
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("conversations");

  // Debounce search input -> query
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load conversations when filters / page / search change
  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
    loadAggregates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, page, filters, searchQuery]);

  // Realtime subscription — mount once
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("sms_conversations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sms_conversations" },
        (payload) => {
          loadConversations();
          loadAggregates();
          if (payload.eventType === "INSERT") {
            showToast("New conversation started", "info");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const applyBaseFilters = (query) => {
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.states.length > 0) query = query.in("conversation_state", filters.states);
    const dateStart = getDateRangeStart(filters.dateRange);
    if (dateStart) query = query.gte("last_interaction_timestamp", dateStart);
    if (filters.reviewFilter === "stale") {
      const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
      query = query
        .eq("conversation_state", "awaiting_property_id")
        .lt("last_interaction_timestamp", cutoff);
    }
    if (searchQuery) {
      const safe = escapeSearch(searchQuery);
      if (safe) {
        query = query.or(`phone_number.ilike.%${safe}%,last_intent.ilike.%${safe}%`);
      }
    }
    return query;
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sms_conversations")
        .select(`*, properties:properties!left(property_name, address, code)`, { count: "exact" })
        .order("last_interaction_timestamp", { ascending: false, nullsFirst: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);
      query = applyBaseFilters(query);
      const { data, error, count } = await query;
      if (error) throw error;
      let rows = data || [];
      if (filters.reviewFilter === "needs_review") {
        rows = rows.filter(needsReview);
      }
      setConversations(rows);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading conversations:", error);
      showToast("Failed to load conversations", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAggregates = async () => {
    try {
      const [totalRes, confirmedRes, todayRes, intentRes] = await Promise.all([
        supabase.from("sms_conversations").select("id", { count: "exact", head: true }),
        supabase
          .from("sms_conversations")
          .select("id", { count: "exact", head: true })
          .eq("conversation_state", "confirmed"),
        supabase
          .from("sms_conversations")
          .select("id", { count: "exact", head: true })
          .gte("last_interaction_timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("sms_conversations").select("last_intent").not("last_intent", "is", null).limit(1000),
      ]);

      const intents = {};
      (intentRes.data || []).forEach((r) => {
        if (r.last_intent) intents[r.last_intent] = (intents[r.last_intent] || 0) + 1;
      });
      const top = Object.entries(intents).sort((a, b) => b[1] - a[1])[0];

      setAggregates({
        total: totalRes.count || 0,
        confirmed: confirmedRes.count || 0,
        activeToday: todayRes.count || 0,
        topIntent: top ? top[0] : null,
      });
    } catch (e) {
      console.error("Aggregate load error", e);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Phone", "Property", "State", "Intent", "Response Preview", "Last Interaction", "Flags"],
      ...conversations.map((conv) => [
        conv.phone_number,
        conv.properties?.property_name || conv.property_id || "N/A",
        conv.conversation_state,
        conv.last_intent || "N/A",
        conv.last_response ? conv.last_response.substring(0, 100) + "..." : "N/A",
        conv.last_interaction_timestamp || "N/A",
        [
          needsReview(conv) ? "needs_review" : null,
          isStale(conv) ? "stale" : null,
          isDataDumpy(conv.last_response, conv.last_intent) ? "data_dumpy" : null,
          hasLeakage(conv) ? "cross_property_leak" : null,
          isRestrictedAutoApproved(conv) ? "restricted_auto_approved" : null,
          hasUnhelpfulFallback(conv) ? "fallback_loop" : null,
          hasHallucinatedAmenity(conv) ? "hallucinated_amenity" : null,
          hasClosedVenueMention(conv) ? "closed_venue" : null,
          isGoogleVerified(conv) ? "google_verified" : null,

        ]
          .filter(Boolean)
          .join("|") || "ok",
      ]),

    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const flaggedCount = useMemo(
    () =>
      conversations.filter(
        (c) =>
          needsReview(c) ||
          isStale(c) ||
          isDataDumpy(c.last_response, c.last_intent) ||
          hasLeakage(c) ||
          isRestrictedAutoApproved(c) ||
          hasUnhelpfulFallback(c) ||
          hasHallucinatedAmenity(c) ||
          hasClosedVenueMention(c)
      ).length,
    [conversations]
  );



  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-heading">SMS Conversations</h1>
            <p className="text-muted-foreground mt-1">Monitor and analyze guest conversations</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                loadConversations();
                loadAggregates();
              }}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: "conversations", label: "Conversations", Icon: MessageSquare },
              { key: "testing", label: "Testing Suite", Icon: TestTube },
              { key: "history", label: "Test History", Icon: History },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conversations Tab */}
        {activeTab === "conversations" && (
          <>
            <ConversationStats aggregates={aggregates} />

            {flaggedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {flaggedCount} of {conversations.length} conversations on this page need attention (needs review, stale, or overly verbose).
                </span>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by phone number or intent..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
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
                    <p className="text-muted-foreground mt-4">Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No conversations found</p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Conversations will appear here when guests start chatting with your properties
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-semibold text-heading">Phone</th>
                          <th className="text-left p-3 font-semibold text-heading">Property</th>
                          <th className="text-left p-3 font-semibold text-heading">State</th>
                          <th className="text-left p-3 font-semibold text-heading">Last Intent</th>
                          <th className="text-left p-3 font-semibold text-heading">Last Response</th>
                          <th className="text-left p-3 font-semibold text-heading">Flags</th>
                          <th className="text-left p-3 font-semibold text-heading">Last Active</th>
                          <th className="text-left p-3 font-semibold text-heading">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversations.map((conv) => {
                          const nr = needsReview(conv);
                          const st = isStale(conv);
                          const dd = isDataDumpy(conv.last_response, conv.last_intent);
                          const leak = hasLeakage(conv);
                          const raa = isRestrictedAutoApproved(conv);
                          const fb = hasUnhelpfulFallback(conv);
                          const ha = hasHallucinatedAmenity(conv);
                          const cv = hasClosedVenueMention(conv);
                          const anyFlag = nr || st || dd || leak || raa || fb || ha || cv;


                          return (
                            <tr
                              key={conv.id}
                              className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => setSelectedConversation(conv)}
                            >
                              <td className="p-3">
                                <span className="font-mono text-sm">{formatPhoneNumber(conv.phone_number)}</span>
                              </td>
                              <td className="p-3">
                                <p className="font-medium text-heading">
                                  {conv.properties?.property_name || conv.property_id || "N/A"}
                                </p>
                                {conv.properties?.address && (
                                  <p className="text-sm text-muted-foreground">{conv.properties.address}</p>
                                )}
                              </td>
                              <td className="p-3">
                                <ConversationStateBadge state={conv.conversation_state} />
                              </td>
                              <td className="p-3">
                                <IntentTag intent={conv.last_intent} />
                              </td>
                              <td className="p-3 max-w-md">
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.last_response || "No response yet"}
                                </p>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {nr && (
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Review
                                    </Badge>
                                  )}
                                  {leak && (
                                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Cross-property
                                    </Badge>
                                  )}
                                  {raa && (
                                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Auto-approved
                                    </Badge>
                                  )}
                                  {fb && (
                                    <Badge variant="outline" className="bg-warning/20 text-warning border-warning/40 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Fallback loop
                                    </Badge>
                                  )}
                                  {ha && (
                                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Hallucinated amenity
                                    </Badge>
                                  )}
                                  {cv && (
                                    <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Closed venue
                                    </Badge>
                                  )}




                                  {st && (
                                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-xs">
                                      Stale
                                    </Badge>
                                  )}
                                  {dd && (
                                    <Badge variant="outline" className="bg-secondary/15 text-secondary-foreground border-secondary/30 text-xs">
                                      <Flame className="mr-1 h-3 w-3" />
                                      Verbose
                                    </Badge>
                                  )}
                                  {!anyFlag && (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-muted-foreground">
                                  {conv.last_interaction_timestamp
                                    ? formatDistanceToNow(new Date(conv.last_interaction_timestamp), { addSuffix: true })
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({totalCount} total conversations)
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "testing" && (
          <div className="space-y-6">
            <QuickSmsTest />
            <PropertyComparisonTest />
          </div>
        )}

        {activeTab === "history" && <TestResultsHistory />}

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
