import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Search } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [properties, setProperties] = useState([]);
  const [propertyCode, setPropertyCode] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyKnowledgeBase, setPropertyKnowledgeBase] = useState("");
  const [propertyUserId, setPropertyUserId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPropertyId, setGuestPropertyId] = useState("");
  const [guests, setGuests] = useState([]);

  const currentUser = {
    id: 0,
    name: "You",
    email: "you@example.com",
    role: "superadmin",
  };

  const addUser = () => {
    const newUser = { id: Date.now(), name, email };
    setUsers([...users, newUser]);
    setName("");
    setEmail("");
  };

  const deleteUser = (id) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  const handleRoleChange = (id, role) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const saveRole = (id) => {
    const user = users.find((u) => u.id === id);
    console.log(`✅ Saved role "${user.role}" for ${user.name}`);
  };

  const addProperty = () => {
    const newProperty = {
      id: Date.now(),
      code: propertyCode || `PROP-${Date.now()}`,
      address: propertyAddress,
      knowledgeBase: propertyKnowledgeBase,
      userId: parseInt(propertyUserId),
    };
    setProperties([...properties, newProperty]);
    setPropertyCode("");
    setPropertyAddress("");
    setPropertyKnowledgeBase("");
    setPropertyUserId("");
  };

  const deleteProperty = (id) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const addGuest = async () => {
    const guest = {
      name: guestName,
      phone: guestPhone,
      property_id: guestPropertyId,
    };
    try {
      await fetch("http://localhost:8000/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guest),
      });
      setGuests([...guests, guest]);
      setGuestName("");
      setGuestPhone("");
      setGuestPropertyId("");
    } catch (err) {
      alert("Failed to add guest: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <h1 className="text-4xl font-bold text-center text-primary mb-6">Admin Dashboard</h1>

      {/* Add User Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Add User</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={addUser} className="mt-4 flex items-center gap-2"><Plus size={16} /> Add User</Button>
        </CardContent>
      </Card>

      {/* Add Property Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Add Property</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Property Code" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
            <Input placeholder="Address" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
            <Input placeholder="Knowledge Base" value={propertyKnowledgeBase} onChange={(e) => setPropertyKnowledgeBase(e.target.value)} />
            <Input placeholder="User ID" value={propertyUserId} onChange={(e) => setPropertyUserId(e.target.value)} />
          </div>
          <Button onClick={addProperty} className="mt-4 flex items-center gap-2"><Plus size={16} /> Add Property</Button>
        </CardContent>
      </Card>

      {/* Add Guest Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Add Guest</h2>
          <div className="grid grid-cols-3 gap-4">
            <Input placeholder="Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <Input placeholder="Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            <Input placeholder="Property ID" value={guestPropertyId} onChange={(e) => setGuestPropertyId(e.target.value)} />
          </div>
          <Button onClick={addGuest} className="mt-4 flex items-center gap-2"><Plus size={16} /> Add Guest</Button>
        </CardContent>
      </Card>
    </div>
  );
}
