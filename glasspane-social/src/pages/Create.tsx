import { useState, useEffect, useRef } from "react";
import { Image, X, MapPin, Users, ChevronDown, Plus, Trash2, AtSign, Video } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Create = () => {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [taggedFriends, setTaggedFriends] = useState<any[]>([]);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (dbUser?.id) {
      fetchFollowers();
    }
  }, [dbUser]);

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/users/${dbUser?.id}/followers`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        alert('Por favor selecciona una imagen o video válido');
        return;
      }

      const maxSize = isVideo ? 30 * 1024 * 1024 : 5 * 1024 * 1024; // 30MB video, 5MB image
      if (file.size > maxSize) {
        alert(isVideo ? 'El video es demasiado grande (máximo 30MB)' : 'La imagen es demasiado grande (máximo 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedMedia(reader.result as string);
        setMediaType(isVideo ? "video" : "image");
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFriendTag = (friend: any) => {
    if (taggedFriends.find(f => f.id === friend.id)) {
      setTaggedFriends(taggedFriends.filter(f => f.id !== friend.id));
    } else {
      setTaggedFriends([...taggedFriends, friend]);
      // Add mention to caption if not already there
      if (!caption.includes(`@${friend.username}`)) {
        setCaption(prev => `${prev} @${friend.username} `);
      }
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaption(value);

    // Check for mention trigger
    const lastWord = value.split(/\s+/).pop();
    if (lastWord?.startsWith('@')) {
      setMentionQuery(lastWord.slice(1));
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }

    // Extract hashtags for preview
    const extractedHashtags = (value.match(/#[\w\u00C0-\u017F]+/g) || []).map(tag => tag.slice(1));
    setHashtags(extractedHashtags);
  };

  const insertMention = (username: string) => {
    const words = caption.split(/\s+/);
    words.pop(); // Remove the partial mention
    const newCaption = [...words, `@${username} `].join(" ");
    setCaption(newCaption);
    setShowMentionSuggestions(false);
    textareaRef.current?.focus();
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) return;
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!dbUser?.id) return;

    const hasPoll = pollQuestion.trim() && pollOptions.filter(opt => opt.trim()).length >= 2;
    if (!selectedMedia && !hasPoll) {
      alert('Por favor, agrega una imagen/video o crea una encuesta');
      return;
    }

    setIsPublishing(true);
    try {
      const postResponse = await fetch('https://stocial.eliverdiaz72.workers.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: dbUser.id,
          media_url: selectedMedia || null,
          image_url: selectedMedia || null,
          caption: caption,
          poll_question: pollQuestion.trim() || null,
          poll_options: pollOptions.filter(opt => opt.trim()),
        })
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        throw new Error(errorText || 'Error al crear la publicación');
      }

      navigate('/profile');
    } catch (error) {
      console.error('Error al publicar:', error);
      const message = error instanceof Error ? error.message : 'Hubo un error al publicar';
      alert(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredFollowers = followers.filter(f =>
    f.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    f.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 flex gap-8">
        {/* Sidebar Profile Preview */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="glass-card p-6 sticky top-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-background shadow-xl">
              <img
                src={dbUser?.profile_picture_url || dbUser?.avatar_url || "https://via.placeholder.com/150"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold">{dbUser?.name}</h2>
            <p className="text-muted-foreground">@{dbUser?.username}</p>

            <div className="mt-6 flex justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-bold text-lg">{dbUser?.followers_count || 0}</p>
                <p className="text-muted-foreground">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{followers.length}</p>
                <p className="text-muted-foreground">Siguiendo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Crear publicación</h1>
            <button
              onClick={handlePublish}
              disabled={!selectedMedia || isPublishing}
              className={cn(
                "px-6 py-2 rounded-xl font-semibold text-sm transition-all",
                selectedMedia && !isPublishing
                  ? "bg-foreground text-background hover:opacity-90 shadow-lg hover:scale-105"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isPublishing ? "Publicando..." : "Publicar"}
            </button>
          </div>

          <div className="space-y-6">
            {/* Image Selection */}
            <div className="glass-card p-4">
              {selectedMedia ? (
                <div className="relative aspect-square rounded-xl overflow-hidden group">
                  {mediaType === "video" ? (
                    <video
                      src={selectedMedia}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={selectedMedia}
                      alt="Selected"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <button
                    onClick={() => {
                      setSelectedMedia(null);
                      setMediaType(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-all group"
                >
                  <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {mediaType === "video" ? (
                      <Video size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <Image size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-lg">Arrastra o selecciona una imagen o video</p>
                    <p className="text-sm text-muted-foreground mt-1">Imágenes hasta 5MB · Videos hasta 30MB</p>
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Caption & Options */}
            <div className="glass-card p-6 space-y-6">
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={dbUser?.profile_picture_url || dbUser?.avatar_url || "https://via.placeholder.com/50"}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
                  />
                  <span className="font-semibold">{dbUser?.username}</span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={handleCaptionChange}
                  placeholder="Escribe un pie de foto... Usa @ para mencionar y # para hashtags"
                  className="w-full h-32 bg-transparent outline-none resize-none text-base placeholder:text-muted-foreground/70"
                />

                {/* Mention Suggestions */}
                {showMentionSuggestions && filteredFollowers.length > 0 && (
                  <div className="absolute bottom-full left-0 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 text-xs font-semibold text-muted-foreground bg-accent/50">Sugerencias</div>
                    {filteredFollowers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user.username)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                      >
                        <img src={user.profile_picture_url || user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hashtag Preview */}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                  {hashtags.map((tag, i) => (
                    <span key={i} className="text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Poll Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Encuesta</p>
                  <span className="text-xs text-muted-foreground">{pollOptions.length}/6</span>
                </div>
                <Input
                  placeholder="Pregunta (opcional)"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Opción ${idx + 1}`}
                        value={opt}
                        onChange={(e) => updatePollOption(idx, e.target.value)}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(idx)}
                          className="p-2 rounded-lg hover:bg-muted"
                          aria-label="Eliminar opción"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Añadir opción
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLocationDialog(true)}
                  className="flex items-center justify-center gap-2 py-3 hover:bg-accent rounded-xl transition-colors border border-border/50"
                >
                  <MapPin size={20} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{location || "Ubicación"}</span>
                </button>

                <button
                  onClick={() => setShowTagDialog(true)}
                  className="flex items-center justify-center gap-2 py-3 hover:bg-accent rounded-xl transition-colors border border-border/50"
                >
                  <Users size={20} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Etiquetar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tag Friends Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Etiquetar personas</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {followers.length > 0 ? (
                followers.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => toggleFriendTag(friend)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                      taggedFriends.find(f => f.id === friend.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <img src={friend.profile_picture_url || friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                    {taggedFriends.find(f => f.id === friend.id) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <AtSign size={12} />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tienes seguidores para etiquetar aún.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Location Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir ubicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Busca una ubicación..."
                className="w-full"
              />
              <div className="space-y-2">
                {["Ciudad de México", "Madrid", "Barcelona", "Buenos Aires", "Bogotá"].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setLocation(loc);
                      setShowLocationDialog(false);
                    }}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <p className="text-sm font-medium">{loc}</p>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Create;
