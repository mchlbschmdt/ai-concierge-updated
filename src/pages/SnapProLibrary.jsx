import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Download, Trash2, Image, Eye, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function SnapProLibrary() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    supabase
      .from('snappro_images')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setImages(data || []);
        setLoading(false);
      });
  }, [currentUser?.id]);

  const handleDelete = async (img) => {
    setDeleting(img.id);
    try {
      // Extract storage path from URL
      const urlParts = img.original_url?.split('/snappro-photos/');
      const storagePath = urlParts?.[1];
      if (storagePath) {
        await supabase.storage.from('snappro-photos').remove([decodeURIComponent(storagePath)]);
      }
      const { error } = await supabase.from('snappro_images').delete().eq('id', img.id);
      if (error) throw error;
      setImages(prev => prev.filter(i => i.id !== img.id));
      toast.success('Photo deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete photo.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'photo';
    a.target = '_blank';
    a.click();
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Image className="w-6 h-6 text-primary" />
              My Photo Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="default" size="sm" onClick={() => navigate('/snappro')}>
            + New Photo
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Image className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No photos yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Head to the Optimizer to enhance your first photo.</p>
            <Button onClick={() => navigate('/snappro')}>Go to Optimizer</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group bg-card border border-border rounded-xl overflow-hidden hover-lift transition-shadow hover:shadow-md">
                <div className="relative aspect-square cursor-pointer" onClick={() => setLightbox(img)}>
                  <img
                    src={img.optimized_url || img.original_url}
                    alt={img.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <StatusBadge status={img.status} />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground truncate">{img.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(img.created_at)}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDownload(img.optimized_url || img.original_url, img.file_name)}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md bg-muted/50 text-foreground hover:bg-muted transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                    <button
                      onClick={() => handleDelete(img)}
                      disabled={deleting === img.id}
                      className="flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {deleting === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightbox.optimized_url || lightbox.original_url}
              alt={lightbox.file_name}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatusBadge({ status }) {
  const colors = {
    completed: 'bg-green-500/80 text-white',
    pending: 'bg-yellow-500/80 text-white',
    processing: 'bg-blue-500/80 text-white',
    failed: 'bg-red-500/80 text-white',
  };
  return (
    <span className={`absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}
