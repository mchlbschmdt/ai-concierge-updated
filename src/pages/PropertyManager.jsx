
// File: src/pages/PropertyManager.jsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PropertyManager() {
  const [properties, setProperties] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchProperties = async () => {
      const snapshot = await getDocs(collection(db, 'properties'));
      setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProperties();
  }, []);

  const handleEdit = (property) => {
    setEditing(property.id);
    setFormData({ ...property });
  };

  const handleUpdate = async () => {
    const propertyRef = doc(db, 'properties', editing);
    await updateDoc(propertyRef, formData);
    setEditing(null);
    window.location.reload();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Properties</h1>

      {properties.map((prop) => (
        <div key={prop.id} className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
          {editing === prop.id ? (
            <div className="space-y-2">
              <Input value={formData.property_name || ''} onChange={(e) => setFormData({ ...formData, property_name: e.target.value })} placeholder="Property Name" />
              <Input value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" />
              <Input value={formData.check_in_time || ''} onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} placeholder="Check-in Time" />
              <Input value={formData.check_out_time || ''} onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} placeholder="Check-out Time" />
              <Input value={formData.local_recommendations || ''} onChange={(e) => setFormData({ ...formData, local_recommendations: e.target.value })} placeholder="Recommendations" />
              <Textarea
                value={formData.knowledge_base || ''}
                onChange={e => setFormData({ ...formData, knowledge_base: e.target.value })}
                placeholder="Knowledge Base"
                className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
              />
              <Button onClick={handleUpdate}>Save</Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{prop.property_name}</h2>
              <p className="text-sm text-gray-600">{prop.address}</p>
              <div className="mt-2">
                <strong>Knowledge Base:</strong>
                <div className="overflow-auto bg-gray-100 p-2 rounded border mt-1 max-h-36 text-sm whitespace-pre-line">
                  {prop.knowledge_base}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(prop)} className="mt-2">
                Edit
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
