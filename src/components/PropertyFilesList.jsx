
import React, { useState } from 'react';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { deleteFileFromProperty } from '../services/fileUploadService';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const FILE_TYPE_LABELS = {
  'application/json': 'JSON',
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
};

function getFileLabel(type, name) {
  if (FILE_TYPE_LABELS[type]) return FILE_TYPE_LABELS[type];
  const ext = name?.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

const BADGE_COLORS = {
  JSON: 'bg-amber-100 text-amber-800',
  PDF: 'bg-red-100 text-red-800',
  TXT: 'bg-gray-100 text-gray-700',
  CSV: 'bg-green-100 text-green-800',
  DOCX: 'bg-blue-100 text-blue-800',
  XLSX: 'bg-emerald-100 text-emerald-800',
};

export default function PropertyFilesList({ files = [], propertyId, onFileDeleted }) {
  const { toast } = useToast();
  const [deletingFile, setDeletingFile] = useState(null);
  
  if (!files || files.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No files uploaded yet.</p>;
  }

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    try {
      setDeletingFile(file.path);
      await deleteFileFromProperty(propertyId, file.path);
      toast({ title: "Success", description: "File deleted successfully" });
      if (onFileDeleted) onFileDeleted(file.path);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const label = getFileLabel(file.type, file.name);
        const badgeColor = BADGE_COLORS[label] || 'bg-secondary text-secondary-foreground';
        const dateStr = file.uploaded_at
          ? new Date(file.uploaded_at).toLocaleDateString()
          : '';

        return (
          <div key={index} className="border border-border p-2 rounded flex items-center justify-between bg-card">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span className="text-sm">{file.name}</span>
              <Badge variant="outline" className={badgeColor}>{label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">{dateStr}</div>
              <button
                onClick={() => handleDeleteFile(file)}
                disabled={deletingFile === file.path}
                className="text-destructive hover:text-destructive/80 p-1 rounded-full hover:bg-muted"
                title="Delete file"
              >
                {deletingFile === file.path ? 
                  <Loader2 size={14} className="animate-spin" /> : 
                  <Trash2 size={14} />
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
