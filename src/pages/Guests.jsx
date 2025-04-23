
// src/pages/Guests.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Users, Search as SearchIcon } from "lucide-react";

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/guests")
      .then(res => res.json())
      .then(data => setGuests(data));
  }, []);

  const filtered = guests.filter(guest =>
    (guest.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.property_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="p-6 flex-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Guests</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search guests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 border rounded focus:outline-primary bg-white"
              />
              <SearchIcon className="absolute left-2 top-2.5 text-gray-400" size={18} />
            </div>
            <Link
              to="/dashboard/guests-manager"
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
            >
              <Users size={18} /> Manage Guests
            </Link>
          </div>
        </div>
        {filtered.map(guest => (
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
