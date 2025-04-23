
// Modern Enterprise Dashboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Home, MessageSquare, AlertTriangle, Calendar, Plus } from "lucide-react";

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
    <section className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl shadow-card p-6 flex flex-col gap-2 border border-gray-100 group transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <Users size={32} className="text-accent group-hover:text-primary transition-colors" />
            <h3 className="font-semibold text-lg">Total Guests</h3>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="font-bold text-3xl font-mono">{guests.length}</span>
            <span className="text-xs text-gray-400">Guests</span>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6 flex flex-col gap-2 border border-gray-100 group transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <Home size={32} className="text-primary group-hover:text-accent transition-colors" />
            <h3 className="font-semibold text-lg">Total Properties</h3>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="font-bold text-3xl font-mono">{properties.length}</span>
            <span className="text-xs text-gray-400">Properties</span>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-card p-6 flex flex-col gap-2 border border-gray-100 group transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <MessageSquare size={32} className="text-accent group-hover:text-primary transition-colors" />
            <h3 className="font-semibold text-lg">Messages</h3>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="font-bold text-3xl font-mono">{messages.length}</span>
            <span className="text-xs text-gray-400">Received</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <h2 className="font-semibold text-xl flex gap-2 items-center text-primary mb-2">
            <AlertTriangle className="text-accent" size={22} />
            Alert Messages
          </h2>
          {alertMessages.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {alertMessages.map((msg, i) => (
                <li key={i} className="p-3 bg-accent/10 rounded-lg text-dark">
                  <span className="font-bold">{msg.guest_name}</span>: {msg.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No urgent alerts at the moment.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <h2 className="font-semibold text-xl flex gap-2 items-center text-primary mb-2">
            <Calendar className="text-primary" size={22} />
            Upcoming Check-Ins
          </h2>
          {upcomingCheckins.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {upcomingCheckins.map((g, i) => (
                <li key={i} className="p-3 bg-primary/10 rounded-lg flex flex-col sm:flex-row gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-xs text-gray-600">– {g.property_id}</span>
                  <span className="ml-auto text-xs text-gray-400">{g.check_in_date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No upcoming check-ins this week.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button onClick={() => navigate("/dashboard/guests-manager")} className="flex gap-2 items-center font-semibold bg-accent hover:bg-primary transition">
          <Plus size={16} />
          Add New Guest
        </Button>
        <Button onClick={() => navigate("/dashboard/add-property")} className="flex gap-2 items-center font-semibold bg-primary hover:bg-accent transition">
          <Plus size={16} />
          Add New Property
        </Button>
      </div>
    </section>
  );
}
