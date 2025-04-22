export default function AdminDashboard() {
  const [users, setUsers] = useState([...]);
  const [properties, setProperties] = useState([]);
  // ... other states and handlers

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <h1 className="text-4xl font-bold text-center text-primary mb-6">Admin Dashboard</h1>

      {/* 👤 USER MANAGEMENT */}
      <Card className="shadow-md border">
        <CardContent className="p-6 space-y-6">
          {/* ... user form JSX */}
        </CardContent>
      </Card>

      {/* 🏘️ PROPERTY MANAGEMENT */}
      <Card className="shadow-md border">
        <CardContent className="p-6 space-y-6">
          {/* ... property form JSX */}
        </CardContent>
      </Card>

      {/* 🧑‍🍼 GUEST MANAGEMENT */}
      <Card className="shadow-md border">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Add Guest Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <Input placeholder="Phone Number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            <Input placeholder="Property ID (e.g. PROP-12345)" value={guestPropertyId} onChange={(e) => setGuestPropertyId(e.target.value)} />
          </div>
          <Button onClick={addGuest}>Add Guest</Button>
        </CardContent>
      </Card>
    </div>
  );
}
