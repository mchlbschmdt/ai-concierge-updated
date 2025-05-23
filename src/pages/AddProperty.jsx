
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { addProperty, uploadFile } from '../services/propertyService';
import FilePreview from '../components/FilePreview';

export default function AddProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  const [form, setForm] = useState({
    property_name: '',
    code: '',
    address: '',
    check_in_time: '4 PM',
    check_out_time: '10 AM',
    local_recommendations: '',
    knowledge_base: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview for text-based files
    if (selectedFile.type === "application/json" || 
        selectedFile.type === "text/plain" || 
        selectedFile.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setFilePreview({
            type: selectedFile.type,
            content: content.slice(0, 500) + (content.length > 500 ? '...' : '')
          });
        } catch (error) {
          console.error("Error reading file:", error);
          setFilePreview(null);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      // For other file types, just show the name and size
      setFilePreview({
        type: selectedFile.type,
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(2) + " KB"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate required fields
      if (!form.property_name || !form.address) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create a timestamped property code if one isn't provided
      const propertyCode = form.code || `PROP-${Date.now()}`;
      
      console.log("Saving property with data:", {
        ...form,
        code: propertyCode
      });
      
      // Add property with optional file
      const result = await addProperty({
        ...form,
        code: propertyCode,
        files: [] // We'll upload files separately
      });
      
      console.log("Property added:", result);
      
      // Upload file if selected
      if (file) {
        // Start upload progress simulation
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        const fileResult = await uploadFile(result.propertyId, file);
        console.log("File uploaded:", fileResult);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Add file to property
        if (fileResult.success) {
          console.log("File added to property");
        }
      }
      
      toast({
        title: "Success!",
        description: "Property has been successfully added.",
      });
      
      // Navigate to the correct properties page with a timestamp to force refresh
      navigate("/dashboard/properties?t=" + Date.now());
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        title: "Error",
        description: `Failed to add property: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-4 text-primary">Add New Property</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="property_name" className="block text-sm font-medium mb-1">Property Name *</label>
          <Input 
            id="property_name"
            name="property_name" 
            value={form.property_name} 
            onChange={handleChange} 
            placeholder="Beach House" 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-1">Unique Code</label>
          <Input 
            id="code"
            name="code" 
            value={form.code} 
            onChange={handleChange} 
            placeholder="BEACH-01 (auto-generated if empty)" 
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">Address *</label>
          <Input 
            id="address"
            name="address" 
            value={form.address} 
            onChange={handleChange} 
            placeholder="123 Main St, City, State" 
            required 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="check_in_time" className="block text-sm font-medium mb-1">Check-in Time</label>
            <Input 
              id="check_in_time"
              name="check_in_time" 
              value={form.check_in_time} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label htmlFor="check_out_time" className="block text-sm font-medium mb-1">Check-out Time</label>
            <Input 
              id="check_out_time"
              name="check_out_time" 
              value={form.check_out_time} 
              onChange={handleChange} 
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="local_recommendations" className="block text-sm font-medium mb-1">Local Recommendations</label>
          <Input 
            id="local_recommendations"
            name="local_recommendations" 
            value={form.local_recommendations} 
            onChange={handleChange} 
            placeholder="Restaurants, attractions, etc." 
          />
        </div>
        
        <div>
          <label htmlFor="knowledge_base" className="block text-sm font-medium mb-1">Knowledge Base</label>
          <Textarea
            id="knowledge_base"
            name="knowledge_base"
            value={form.knowledge_base}
            onChange={handleChange}
            placeholder="Include important property details, house rules, wifi passwords, etc."
            className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
          />
        </div>
        
        <div>
          <label htmlFor="file_upload" className="block text-sm font-medium mb-1">Attach File (optional)</label>
          <Input
            id="file_upload"
            type="file"
            onChange={handleFileChange}
            className="mb-2"
            accept=".pdf,.docx,.txt,.csv,.xlsx,.json"
          />
          
          {/* File Preview */}
          {file && (
            <div className="mt-2">
              <FilePreview 
                file={file}
                filePreview={filePreview}
                onClear={handleClearFile}
              />
              
              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {file ? 'Uploading...' : 'Adding Property...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Property
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
