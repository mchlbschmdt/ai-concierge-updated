
// src/pages/Guests.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

export default function Guests() {
  const [guests, setGuests] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/guests")
      .then(res => res.json())
      .then(data => setGuests(data));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Guests</h2>
          <Link
            to="/dashboard/guests-manager"
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
          >
            <Users size={18} /> Manage Guests
          </Link>
        </div>
        {guests.map(guest => (
          <div key={guest.phone} className="border p-4 mb-2 bg-white rounded shadow">
            <p><strong>Name:</strong> {guest.name}</p>
            <p><strong>Phone:</strong> {guest.phone}</p>
            <p><strong>Property:</strong> {guest.property_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
