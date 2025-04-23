
// src/pages/Properties.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function Properties() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/properties")
      .then(res => res.json())
      .then(data => setProperties(data));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="p-6 flex-1 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Properties</h2>
          <Link
            to="/dashboard/add-property"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
          >
            <Plus size={18} /> Add Property
          </Link>
        </div>
        {properties.map(property => (
          <div key={property.code} className="border p-4 mb-2 bg-white shadow rounded">
            <p><strong>Code:</strong> {property.code}</p>
            <p><strong>Address:</strong> {property.address}</p>
            <p><strong>User Assigned:</strong> {property.user_id}</p>
            <div>
              <strong>Knowledge Base:</strong>
              <div className="overflow-auto bg-gray-100 p-2 rounded border mt-1 max-h-36 text-sm whitespace-pre-line">{property.knowledgeBase}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
