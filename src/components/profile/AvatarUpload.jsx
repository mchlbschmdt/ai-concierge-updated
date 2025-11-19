import React, { useRef, useState } from 'react';
import { Upload, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AvatarUpload = ({ currentAvatar, onAvatarChange, preview, onDelete }) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(preview || currentAvatar || null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      onAvatarChange(file);
    }
  };

  const handleDelete = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onAvatarChange(null);
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        {previewUrl && (
          <button
            onClick={handleDelete}
            className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {previewUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WEBP. Max 2MB.
        </p>
      </div>
    </div>
  );
};
