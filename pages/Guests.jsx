// src/pages/Guests.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Guests() {
  const [guests, setGuests] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/guests")
      .then(res => res.json())
      .then(data => setGuests(data));
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6 flex-1">
        <h2 className="text-2xl font-bold mb-4">Guests</h2>
        {guests.map(guest => (
          <div key={guest.phone} className="border p-4 mb-2">
            <p><strong>Name:</strong> {guest.name}</p>
            <p><strong>Phone:</strong> {guest.phone}</p>
            <p><strong>Property:</strong> {guest.property_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
