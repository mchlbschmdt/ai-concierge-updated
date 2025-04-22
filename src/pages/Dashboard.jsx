// ✅ Dashboard.jsx with interactive features
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [guests, setGuests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const guestSnap = await getDocs(collection(db, "guests"));
      setGuests(guestSnap.docs.map(doc => doc.data()));

      const propSnap = await getDocs(collection(db, "properties"));
      setProperties(propSnap.docs.map(doc => doc.data()));

      const msgSnap = await getDocs(query(collection(db, "messages"), orderBy("timestamp", "desc")));
      setMessages(msgSnap.docs.map(doc => doc.data()));
    };
    fetchData();
  }, []);

  const upcomingCheckins = guests.filter(g => g.check_in_date && new Date(g.check_in_date) >= new Date())
    .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))
    .slice(0, 5);

  const alertMessages = messages.filter(msg =>
    msg.message?.toLowerCase().includes("no hot water") ||
    msg.message?.toLowerCase().includes("locked out")
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Concierge Admin Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Total Guests</p>
          <p className="text-xl font-bold">{guests.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Total Properties</p>
          <p className="text-xl font-bold">{properties.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Messages Received</p>
          <p className="text-xl font-bold">{messages.length}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mt-8">🔔 Alert Messages</h2>
        {alertMessages.length > 0 ? (
          <ul className="list-disc list-inside mt-2">
            {alertMessages.map((msg, i) => (
              <li key={i}><strong>{msg.guest_name}</strong>: {msg.message}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No urgent alerts at the moment.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mt-8">📅 Upcoming Check-Ins</h2>
        {upcomingCheckins.length > 0 ? (
          <ul className="list-disc list-inside mt-2">
            {upcomingCheckins.map((g, i) => (
              <li key={i}>{g.name} - {g.property_id} - {g.check_in_date}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No upcoming check-ins this week.</p>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        <Button onClick={() => navigate("/dashboard/guests")}>Add New Guest</Button>
        <Button onClick={() => navigate("/dashboard/properties")}>Add New Property</Button>
      </div>
    </div>
  );
}
