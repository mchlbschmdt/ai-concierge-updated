
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, MessageSquare, Phone, Search as SearchIcon, Filter as FilterIcon } from "lucide-react";

function groupMessagesByPhone(messages) {
  const groups = {};
  messages.forEach((msg) => {
    if (!msg.phone) return;
    if (!groups[msg.phone])
      groups[msg.phone] = { guestName: msg.guest_name || msg.name, property: msg.property_name, messages: [] };
    groups[msg.phone].messages.push(msg);
  });
  return groups;
}

export default function MessagesDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGuest, setOpenGuest] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const querySnapshot = await getDocs(collection(db, "messages"));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(data);
      setLoading(false);
    };
    fetchMessages();
  }, []);

  // Filtering function (search by guest name, property, or message)
  const filteredMessages = messages.filter((msg) =>
    (msg.guest_name || msg.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.message || "").toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupMessagesByPhone(filteredMessages);

  return (
    <div className="p-6 space-y-10 bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-blue-900">📬 Guest Messages by Phone</h1>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search by guest, property, phone, or message…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 border rounded focus:outline-primary bg-white w-full"
          />
          <SearchIcon className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-gray-400 text-lg mt-12 text-center">
              No messages found.
            </div>
          ) : (
            Object.entries(grouped).map(([phone, group]) => {
              const guestHeader =
                (group.guestName ? group.guestName + " – " : "") +
                phone +
                (group.property ? ` | Property: ${group.property}` : "");
              return (
                <div key={phone} className="border rounded-xl overflow-hidden bg-blue-50/40 shadow group">
                  <button
                    className="flex items-center w-full px-6 py-4 bg-blue-800/90 text-white text-left font-semibold text-lg hover:bg-blue-900 transition"
                    onClick={() => setOpenGuest(openGuest === phone ? null : phone)}
                  >
                    <Phone size={20} className="mr-2" />
                    <span className="flex-1">{guestHeader}</span>
                    {openGuest === phone ? (
                      <ChevronUp size={22} />
                    ) : (
                      <ChevronDown size={22} />
                    )}
                  </button>
                  {openGuest === phone && (
                    <div className="bg-white divide-y divide-gray-100">
                      {group.messages.map((msg) => (
                        <Card key={msg.id} className="shadow-none bg-white border-0 px-6 py-3">
                          <CardContent className="space-y-1">
                            <div className="flex gap-2 items-center text-blue-700 font-semibold">
                              <MessageSquare size={16} />
                              <span>{msg.message}</span>
                            </div>
                            <div className="ml-6 text-gray-600">
                              <span className="block">
                                <strong>🤖 Response:</strong> {msg.response}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {msg.timestamp?.seconds
                                  ? new Date(msg.timestamp.seconds * 1000).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
