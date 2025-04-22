import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Search } from "lucide-react";
import AddGuest from "./AddGuest.jsx";

const currentUser = {
  id: 0,
  name: "You",
  email: "you@example.com",
  role: "superadmin",
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([
    { id: 1, name: "Jane Doe", email: "jane@example.com", role: "admin" },
    { id: 2, name: "John Smith", email: "john@example.com", role: "hosting_manager" },
  ]);
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

  const addUser = () => {
    const newUser = { id: Date.now(), name, email };
    setUsers([...users, newUser]);
    setName("");
    setEmail("");
  };

  const deleteUser = (id) => {
    setUsers(users.filter((user) => user.id !== id));
  };

  const handleRoleChange = (id, newRole) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role: newRole } : user)));
  };

  const saveRole = (userId) => {
    const user = users.find((u) => u.id === userId);
    console.log(`✅ Saved role "${user.role}" for user: ${user.name}`);
  };

  const addProperty = async () => {
    const newProperty = {
      code: propertyCode || `PROP-${Date.now()}`,
      address: propertyAddress,
      knowledge_base: propertyKnowledgeBase,
      user_id: parseInt(propertyUserId),
    };
    try {
      await fetch("http://35.237.164.219:8000/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProperty),
      });
      setProperties([...properties, { id: Date.now(), ...newProperty }]);
      setPropertyCode("");
      setPropertyAddress("");
      setPropertyKnowledgeBase("");
      setPropertyUserId("");
    } catch (err) {
      alert("Failed to add property: " + err.message);
    }
  };

  const deleteProperty = (id) => {
    setProperties(properties.filter((property) => property.id !== id));
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProperties = properties.filter(
    (property) =>
      property.code.toLowerCase().includes(propertySearch.toLowerCase()) ||
      property.address.toLowerCase().includes(propertySearch.toLowerCase()) ||
      property.knowledge_base.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const addGuest = async () => {
    const guest = {
      name: guestName,
      phone: guestPhone,
      property_id: guestPropertyId,
    };
    try {
      await fetch("http://35.237.164.219:8000/api/guests", {
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

      <Card className="shadow-md border">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Add Guest Info</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Input placeholder="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <Input placeholder="Phone Number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            <Input placeholder="Property ID (e.g. PROP-12345)" value={guestPropertyId} onChange={(e) => setGuestPropertyId(e.target.value)} />
          </div>
          <Button onClick={addGuest} className="mt-2">Add Guest</Button>
        </CardContent>
      </Card>

      <Card className="shadow-md border">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Add Property</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Input placeholder="Property Code" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
            <Input placeholder="Property Address" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
            <Input placeholder="Knowledge Base (text)" value={propertyKnowledgeBase} onChange={(e) => setPropertyKnowledgeBase(e.target.value)} />
            <Input placeholder="User ID (numeric)" value={propertyUserId} onChange={(e) => setPropertyUserId(e.target.value)} />
          </div>
          <Button onClick={addProperty} className="mt-2">Add Property</Button>
        </CardContent>
      </Card>
    </div>
  );
}
