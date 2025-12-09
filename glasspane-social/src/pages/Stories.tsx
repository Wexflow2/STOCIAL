import React, { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { X, Plus, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Stories = () => {
  const { dbUser } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const loadStories = async () => {
    if (!dbUser?.id) return;
    setLoadingFeed(true);
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/stories/feed?currentUserId=${dbUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (err) {
      console.error('Error loading stories:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, [dbUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadStory = async () => {
    if (!selectedImage || !dbUser?.id) return;

    setLoading(true);
    try {
      const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: dbUser.id,
          image_url: selectedImage,
          caption,
          type: 'image',
          duration: 5
        })
      });

      if (response.ok) {
        setShowUploadDialog(false);
        setSelectedImage(null);
        setCaption('');
        loadStories();
      }
    } catch (err) {
      console.error('Error uploading story:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Historias</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Upload Story Card */}
          <button
            onClick={() => setShowUploadDialog(true)}
            className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-accent to-background border-2 border-muted hover:border-foreground transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group"
          >
            <Plus className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              Tu historia
            </span>
          </button>

          {/* Stories Grid */}
          {loadingFeed && (
            <div className="col-span-full text-center text-muted-foreground py-6">Cargando historias...</div>
          )}
          {!loadingFeed && stories.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-6">No hay historias aún.</div>
          )}
          {stories.map((storyGroup) =>
            storyGroup.stories.map((story: any) => (
              <div
                key={story.id}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group`}
              >
                <img
                  src={story.image_url}
                  alt={story.caption || storyGroup.username}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={storyGroup.avatar_url || "https://via.placeholder.com/50"}
                        alt={storyGroup.username}
                        className="w-8 h-8 rounded-full object-cover border border-white"
                      />
                      <div>
                        <p className="text-white text-sm font-semibold">@{storyGroup.username}</p>
                        <p className="text-white/60 text-xs">{story.caption}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Story Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-background rounded-2xl shadow-xl glass-card">
            <div className="flex items-center justify-between p-6 border-b border-muted">
              <h2 className="text-xl font-bold">Crear historia</h2>
              <button
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedImage(null);
                  setCaption('');
                }}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedImage ? (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Añade un pie de foto (opcional)"
                    className="w-full h-20 p-3 bg-background border border-muted rounded-lg focus:outline-none focus:border-foreground transition-colors resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="flex-1 py-3 px-4 rounded-lg border border-muted hover:border-foreground transition-colors font-semibold"
                    >
                      Cambiar
                    </button>
                    <button
                      onClick={handleUploadStory}
                      disabled={loading}
                      className="flex-1 py-3 px-4 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        'Compartir'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-muted hover:border-foreground transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer"
                  >
                    <Plus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Selecciona una imagen
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
