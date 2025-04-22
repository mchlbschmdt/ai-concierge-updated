import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const fetchGuests = async () => {
    const snapshot = await getDocs(collection(db, "guests"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGuests(data);
  };

  const handleAddGuest = async () => {
    if (!name || !phone || !propertyId) return;
    await addDoc(collection(db, "guests"), {
      name,
      phone,
      property_id: propertyId,
    });
    setName("");
    setPhone("");
    setPropertyId("");
    fetchGuests();
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Add New Guest</h2>
      <div className="flex gap-4">
        <Input
          placeholder="Guest Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          placeholder="Property ID (e.g., PR1234)"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        />
        <Button onClick={handleAddGuest}>Add</Button>
      </div>

      <h3 className="text-xl font-semibold">Guest List</h3>
      <ul className="list-disc list-inside">
        {guests.map((guest) => (
          <li key={guest.id}>
            {guest.name} — {guest.phone} (Property: {guest.property_id})
          </li>
        ))}
      </ul>
    </div>
  );
}
