
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Plus, FileText, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import KnowledgeBaseUploader from '../components/KnowledgeBaseUploader';
import AirbnbMessageParser from '../components/AirbnbMessageParser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PropertyManager() {
  const { toast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'properties'));
        const propertiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProperties(propertiesData);
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [toast]);

  const handleEdit = (property) => {
    setEditing(property.id);
    setFormData({ ...property });
  };

  const handleUpdate = async () => {
    try {
      const propertyRef = doc(db, 'properties', editing);
      await updateDoc(propertyRef, formData);
      
      // Update local state
      setProperties(prev => prev.map(p => 
        p.id === editing ? { ...p, ...formData } : p
      ));
      
      setEditing(null);
      
      toast({
        title: "Success",
        description: "Property updated successfully"
      });
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive"
      });
    }
  };
  
  const toggleSection = (propertyId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${propertyId}_${section}`]: !prev[`${propertyId}_${section}`]
    }));
  };
  
  const isSectionExpanded = (propertyId, section) => {
    return !!expandedSections[`${propertyId}_${section}`];
  };
  
  const handleFileAdded = (propertyId, fileData) => {
    // Update the local state to include the new file
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        files: [...(p.files || []), fileData]
      };
    }));
  };
  
  const handleMessagesAdded = (propertyId, messages) => {
    // Update the local state to include the new messages
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        messages: [...(p.messages || []), ...messages]
      };
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
        <Link 
          to="/dashboard/add-property" 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          <Plus size={18} /> Add New Property
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading properties...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-gray-700">No Properties Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-1">
            You haven't added any properties yet. Get started by adding your first property.
          </p>
          <Link
            to="/dashboard/add-property"
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Link>
        </div>
      ) : (
        properties.map((prop) => (
          <div key={prop.id} className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
            {editing === prop.id ? (
              <div className="space-y-4">
                <Input 
                  value={formData.property_name || ''} 
                  onChange={(e) => setFormData({ ...formData, property_name: e.target.value })} 
                  placeholder="Property Name" 
                />
                <Input 
                  value={formData.address || ''} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  placeholder="Address" 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    value={formData.check_in_time || ''} 
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} 
                    placeholder="Check-in Time" 
                  />
                  <Input 
                    value={formData.check_out_time || ''} 
                    onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} 
                    placeholder="Check-out Time" 
                  />
                </div>
                <Input 
                  value={formData.local_recommendations || ''} 
                  onChange={(e) => setFormData({ ...formData, local_recommendations: e.target.value })} 
                  placeholder="Local Recommendations" 
                />
                <Textarea
                  value={formData.knowledge_base || ''}
                  onChange={e => setFormData({ ...formData, knowledge_base: e.target.value })}
                  placeholder="Knowledge Base"
                  className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} className="flex-1">Save</Button>
                  <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">{prop.property_name}</h2>
                    <p className="text-sm text-gray-600">{prop.address}</p>
                    <p className="text-xs text-gray-500">Code: {prop.code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(prop)} className="self-start">
                    Edit Property
                  </Button>
                </div>
                
                <Tabs defaultValue="details" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-medium mb-2">Check-in / Check-out</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
                        <div>
                          <span className="text-gray-500">Check-in:</span> {prop.check_in_time}
                        </div>
                        <div>
                          <span className="text-gray-500">Check-out:</span> {prop.check_out_time}
                        </div>
                      </div>
                    </div>
                    
                    {prop.local_recommendations && (
                      <div>
                        <h3 className="font-medium mb-2">Local Recommendations</h3>
                        <div className="text-sm bg-gray-50 p-2 rounded">
                          {prop.local_recommendations}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium mb-2">Knowledge Base</h3>
                      <div className="overflow-auto bg-gray-100 p-3 rounded border mt-1 max-h-64 text-sm whitespace-pre-line">
                        {prop.knowledge_base || "No knowledge base information available."}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="files" className="space-y-4 mt-4">
                    <KnowledgeBaseUploader 
                      propertyId={prop.id}
                      onFileAdded={(fileData) => handleFileAdded(prop.id, fileData)}
                    />
                    
                    <div>
                      <h3 className="font-medium mb-2">Uploaded Files</h3>
                      {prop.files && prop.files.length > 0 ? (
                        <div className="space-y-2">
                          {prop.files.map((file, index) => (
                            <div key={index} className="border p-2 rounded flex items-center justify-between bg-white">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-primary" />
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(file.uploaded_at?.seconds * 1000 || Date.now()).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No files uploaded yet.</p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="messages" className="space-y-4 mt-4">
                    <AirbnbMessageParser 
                      propertyId={prop.id}
                      onMessagesAdded={(messages) => handleMessagesAdded(prop.id, messages)}
                    />
                    
                    <div>
                      <h3 className="font-medium mb-2">Message History</h3>
                      {prop.messages && prop.messages.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {prop.messages.map((message, index) => (
                            <div key={index} className="border p-3 rounded bg-white">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">
                                    {message.sender} → {message.receiver}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(message.timestamp?.seconds * 1000 || Date.parse(message.timestamp) || Date.now()).toLocaleString()}
                                  </p>
                                </div>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {message.source || "airbnb"}
                                </span>
                              </div>
                              <p className="mt-1 text-sm whitespace-pre-line">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No messages imported yet.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
