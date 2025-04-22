import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AddGuest() {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPropertyId, setGuestPropertyId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch("http://35.237.164.219:8000/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestName,
          phone: guestPhone,
          property_id: guestPropertyId,
        }),
      });
      alert("✅ Guest added!");
      setGuestName("");
      setGuestPhone("");
      setGuestPropertyId("");
    } catch (err) {
      alert("❌ Failed to add guest");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Guest</h2>
      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          placeholder="Guest Name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Phone Number"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Property ID (e.g. PROP-12345)"
          value={guestPropertyId}
          onChange={(e) => setGuestPropertyId(e.target.value)}
        />
        <Button type="submit" className="mt-4 w-full">
          Add Guest
        </Button>
      </form>
    </div>
  );
}
