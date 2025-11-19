import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, MessageSquare } from "lucide-react";
import ConversationStateBadge from "./ConversationStateBadge";
import IntentTag from "./IntentTag";
import { formatDistanceToNow } from "date-fns";

export default function ConversationDetailModal({ conversation, onClose, onRefresh }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sms_conversation_messages")
        .select("*")
        .eq("sms_conversation_id", conversation.id)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      showToast("Failed to load message history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this conversation? This will clear the conversation state.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("sms_conversations")
        .update({
          conversation_state: "awaiting_property_id",
          property_id: null,
          property_confirmed: false,
          conversation_context: {},
        })
        .eq("id", conversation.id);

      if (error) throw error;

      showToast("Conversation reset successfully", "success");
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Error resetting conversation:", error);
      showToast("Failed to reset conversation", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-soft flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-heading">Conversation Details</h2>
              <ConversationStateBadge state={conversation.conversation_state} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-dark">Phone:</span>
                <p className="font-mono font-medium text-heading">{conversation.phone_number}</p>
              </div>
              <div>
                <span className="text-gray-dark">Property:</span>
                <p className="font-medium text-heading">
                  {conversation.properties?.property_name || conversation.property_id || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-dark">Last Intent:</span>
                <div className="mt-1">
                  <IntentTag intent={conversation.last_intent} />
                </div>
              </div>
              <div>
                <span className="text-gray-dark">Last Active:</span>
                <p className="font-medium text-heading">
                  {conversation.last_interaction_timestamp
                    ? formatDistanceToNow(new Date(conversation.last_interaction_timestamp), {
                        addSuffix: true,
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {conversation.last_response && (
              <div>
                <h3 className="font-semibold text-heading mb-2">Last Response</h3>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-gray-dark whitespace-pre-wrap">{conversation.last_response}</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-heading mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message History ({messages.length})
              </h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-dark mt-2">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-dark text-center py-8">No messages found</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-secondary text-white ml-8"
                          : "bg-muted text-gray-dark mr-8"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold">
                          {message.role === "user" ? "Guest" : "AI Assistant"}
                        </span>
                        <span className="text-xs opacity-75">
                          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {conversation.conversation_context &&
              Object.keys(conversation.conversation_context).length > 0 && (
                <div>
                  <h3 className="font-semibold text-heading mb-2">Conversation Context</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-xs text-gray-dark overflow-x-auto">
                      {JSON.stringify(conversation.conversation_context, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

            {conversation.preferences && Object.keys(conversation.preferences).length > 0 && (
              <div>
                <h3 className="font-semibold text-heading mb-2">Guest Preferences</h3>
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-xs text-gray-dark overflow-x-auto">
                    {JSON.stringify(conversation.preferences, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-soft flex justify-between">
          <Button variant="outline" onClick={handleReset} className="text-error border-error">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Conversation
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
