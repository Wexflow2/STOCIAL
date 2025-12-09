import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { parseCaption } from "@/lib/parseCaption";
import { VerifiedBadge, isVerifiedUser } from "@/components/VerifiedBadge";

interface PostCardProps {
  id: string;
  userId?: number;
  username: string;
  userAvatar: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio";
  pollQuestion?: string | null;
  pollOptions?: string[] | null;
  pollVotes?: Record<string, number>;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isPrivate?: boolean;
  onDeleted?: () => void;
}

export function PostCard({
  id,
  userId,
  username,
  userAvatar,
  imageUrl,
  mediaUrl,
  mediaType,
  pollQuestion,
  pollOptions,
  pollVotes,
  caption,
  likes,
  comments,
  timeAgo,
  isLiked: initialLiked = false,
  isSaved: initialSaved = false,
  isPrivate: initialPrivate = false,
  onDeleted,
}: PostCardProps) {
  const { dbUser } = useAuth();
  const { socket } = useSocket();
  const mediaSrc = useMemo(() => {
    const placeholder =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='%239ca3af' text-anchor='middle' dy='.35em'%3EPost%3C/text%3E%3C/svg%3E";
    const clean = (val?: string | null) => {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
    };
    return clean(mediaUrl) || clean(imageUrl) || placeholder;
  }, [imageUrl, mediaUrl]);
  const safePollOptions = pollOptions || [];
  const [mediaFallback, setMediaFallback] = useState(false);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [likeCount, setLikeCount] = useState(likes);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCount, setCommentCount] = useState(comments);
  const [showMenu, setShowMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [pollState, setPollState] = useState<Record<string, number>>(pollVotes || {});
  const [shareMessage, setShareMessage] = useState("");

  const resolvedType: "image" | "video" | "audio" = useMemo(() => {
    const lower = mediaSrc?.toLowerCase() || "";
    if (lower.startsWith("data:video") || lower.match(/\.(mp4|webm|mov)$/i)) return "video";
    if (lower.startsWith("data:audio") || lower.match(/\.(mp3|wav|ogg)$/i)) return "audio";
    // Si viene marcado como video/audio lo respetamos, pero si dice image y detectamos otra cosa, usamos lo detectado
    if (mediaType && mediaType !== "image") return mediaType;
    return mediaType || "image";
  }, [mediaType, mediaSrc]);

  const pollCounts = useMemo(() => {
    const counts = Array(safePollOptions.length).fill(0);
    Object.values(pollState || {}).forEach((val) => {
      const idx = Number(val);
      if (!Number.isNaN(idx) && counts[idx] !== undefined) counts[idx] += 1;
    });
    return counts;
  }, [safePollOptions.length, pollState]);

  const userVote = dbUser ? pollState[String(dbUser.id)] : undefined;

  useEffect(() => {
    if (!socket) return;

    socket.on("update_likes", (data: { postId: number; likesCount: number }) => {
      if (data.postId === Number(id)) {
        setLikeCount(data.likesCount);
      }
    });

    socket.on(`new_comment_${id}`, (comment: any) => {
      setCommentsList((prev) => [...prev, comment]);
      setCommentCount((prev) => prev + 1);
    });

    return () => {
      socket.off("update_likes");
      socket.off(`new_comment_${id}`);
    };
  }, [socket, id]);

  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    if (pollVotes) {
      setPollState(pollVotes);
    }
  }, [pollVotes]);

  useEffect(() => {
    setIsPrivate(initialPrivate);
  }, [initialPrivate]);

  useEffect(() => {
    if (resolvedType !== "video" || !videoRef.current) return;

    const videoEl = videoRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoEl.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(videoEl);

    return () => observer.disconnect();
  }, [resolvedType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`#post-menu-${id}`)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMenu, id]);

  useEffect(() => {
    if (resolvedType !== "audio" || !audioRef.current) return;
    const audioEl = audioRef.current;
    const handleLoaded = () => setAudioDuration(audioEl.duration || 0);
    const handleTime = () => setAudioProgress(audioEl.currentTime || 0);
    const handleEnded = () => {
      setIsAudioPlaying(false);
      setAudioProgress(0);
    };
    audioEl.addEventListener("loadedmetadata", handleLoaded);
    audioEl.addEventListener("timeupdate", handleTime);
    audioEl.addEventListener("ended", handleEnded);
    return () => {
      audioEl.removeEventListener("loadedmetadata", handleLoaded);
      audioEl.removeEventListener("timeupdate", handleTime);
      audioEl.removeEventListener("ended", handleEnded);
    };
  }, [resolvedType, mediaSrc]);

  useEffect(() => {
    if (resolvedType !== "audio" && audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      setAudioProgress(0);
    }
  }, [resolvedType]);

  const handleLike = async () => {
    if (!dbUser) return;

    const previousLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      await fetch("http://localhost:5000/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, user_id: dbUser.id }),
      });
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error("Error liking post:", error);
    }
  };

  const handleSave = async () => {
    if (!dbUser) return;

    const previousSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      await fetch("http://localhost:5000/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, user_id: dbUser.id }),
      });
    } catch (error) {
      setIsSaved(previousSaved);
      console.error("Error saving post:", error);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url: postUrl, title: username });
        setShareMessage("Compartido");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
        setShareMessage("Enlace copiado");
      }
    } catch (err) {
      // Si el usuario cancela el diálogo de compartir, no lo tratamos como error
      if ((err as any)?.name === "AbortError") {
        setShareMessage("Compartir cancelado");
      } else {
        console.error("Error sharing post:", err);
        setShareMessage("Error al compartir");
      }
    } finally {
      setTimeout(() => setShareMessage(""), 1500);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !dbUser) return;

    try {
      await fetch("http://localhost:5000/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, user_id: dbUser.id, content: newComment }),
      });
      setNewComment("");
    } catch (error) {
      console.error("Error commenting:", error);
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    try {
      const url = new URL(`http://localhost:5000/api/comments/${id}`);
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setCommentsList(data);
      }
      setShowComments(true);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleCommentLike = async (commentId: number, currentLiked: boolean) => {
    if (!dbUser) return;

    try {
      const response = await fetch("http://localhost:5000/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, user_id: dbUser.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setCommentsList(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, isLiked: data.liked, likes_count: data.likesCount } 
            : c
        ));
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(likeCount + 1);
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleDeletePost = async () => {
    if (!dbUser) return;
    const confirmed = window.confirm("¿Eliminar esta publicación?");
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: dbUser.id }),
      });
      if (!response.ok) throw new Error("No se pudo eliminar");
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("No se pudo eliminar la publicación");
    } finally {
      setActionLoading(false);
      setShowMenu(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!dbUser) return;
    const next = !isPrivate;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}/privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: dbUser.id, is_private: next }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar");
      setIsPrivate(next);
    } catch (err) {
      console.error("Error toggling privacy:", err);
      alert("No se pudo actualizar la privacidad");
    } finally {
      setActionLoading(false);
      setShowMenu(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  };

  const handleSeekAudio = (percent: number) => {
    if (!audioRef.current || !audioDuration) return;
    const nextTime = Math.max(0, Math.min(1, percent)) * audioDuration;
    audioRef.current.currentTime = nextTime;
    setAudioProgress(nextTime);
  };

  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const minutes = Math.floor(s / 60);
    const seconds = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const waveformBars = [4, 10, 6, 14, 12, 8, 16, 7, 13, 5, 11, 15, 9, 12, 6, 10];
  const audioPercent = audioDuration ? Math.min(audioProgress / audioDuration, 1) : 0;

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handlePollVote = async (optionIndex: number) => {
    if (!dbUser || typeof optionIndex !== "number") return;
    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}/poll-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: dbUser.id, option_index: optionIndex }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.poll_votes) {
          setPollState(data.poll_votes);
        }
      }
    } catch (err) {
      console.error("Error voting poll:", err);
    }
  };

  return (
    <article className="glass-card overflow-hidden fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <Link to={`/profile?username=${username}`}>
            <img
              src={userAvatar}
              alt={username}
              className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
            />
          </Link>
          <div>
            <Link to={`/profile?username=${username}`} className="font-semibold text-base text-foreground hover:underline flex items-center gap-1">
              {username}
              {isVerifiedUser(username) && <VerifiedBadge className="ml-0.5" variant="blue" />}
            </Link>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
            {isPrivate && (
              <p className="text-[11px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full w-fit mt-1 font-semibold">
                Privado
              </p>
            )}
          </div>
        </div>
        {dbUser?.id === userId && (
          <div className="relative" id={`post-menu-${id}`}>
            <button
              className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              onClick={() => setShowMenu((p) => !p)}
              disabled={actionLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border bg-background shadow-lg z-10 overflow-hidden">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-60"
                  onClick={handleTogglePrivacy}
                  disabled={actionLoading}
                >
                  {isPrivate ? "Mover a público" : "Mover a privado"}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                  onClick={handleDeletePost}
                  disabled={actionLoading}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      <div
        className="w-full bg-muted relative cursor-pointer select-none overflow-hidden"
        onDoubleClick={resolvedType === "image" ? handleDoubleTap : undefined}
        style={{ aspectRatio: "1 / 1" }}
      >
        {resolvedType === "video" ? (
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              src={mediaSrc}
              className="w-full h-full object-cover bg-black"
              muted={isMuted}
              loop
              playsInline
              autoPlay
              onClick={toggleVideoPlay}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="px-3 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur hover:bg-black/80 transition"
              >
                {isMuted ? "Silenciado" : "Sonando"}
              </button>
              <span className="px-2 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur">
                {isPlaying ? "Reproduciendo" : "Pausado"}
              </span>
            </div>
          </div>
        ) : resolvedType === "audio" ? (
          <div className="h-full w-full bg-gradient-to-br from-primary/5 via-background to-accent/20 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white/80 dark:bg-neutral-900/80 border border-border/60 rounded-2xl shadow-md px-4 py-3 flex items-center gap-4">
              <button
                onClick={toggleAudioPlay}
                className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition"
              >
                {isAudioPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  {waveformBars.map((h, idx) => {
                    const barPercent = (idx + 1) / waveformBars.length;
                    const active = audioPercent >= barPercent;
                    return (
                      <span
                        key={idx}
                        className="block w-1 rounded-full transition-all duration-150"
                        style={{
                          height: `${h * 4}px`,
                          backgroundColor: active ? "var(--primary)" : "rgba(0,0,0,0.2)",
                          opacity: active ? 0.95 : 0.3,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2">
                  <div
                    className="w-full h-1.5 rounded-full bg-muted relative cursor-pointer group"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      handleSeekAudio(pct);
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                      style={{ width: `${audioPercent * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `${audioPercent * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(audioProgress)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={toggleAudioPlay}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              <audio ref={audioRef} src={mediaSrc} className="hidden" />
            </div>
          </div>
        ) : (
          <img
            src={mediaFallback ? "https://via.placeholder.com/600x600?text=Post" : mediaSrc}
            alt="Post"
            className="w-full h-full object-cover bg-muted"
            onError={() => setMediaFallback(true)}
          />
        )}
        {/* Heart animation on double tap */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none",
            showHeart ? "opacity-100" : "opacity-0"
          )}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500 drop-shadow-lg transition-all duration-300"
          >
            <path
              d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <button
              onClick={handleLike}
              className={cn(
                "transition-all duration-200 hover:scale-110 active:scale-95 text-foreground/80 hover:text-foreground",
                isLiked && "text-destructive"
              )}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                />
              </svg>
            </button>

            <button
              onClick={loadComments}
              className="transition-all duration-200 hover:scale-110 active:scale-95 text-foreground/80 hover:text-foreground"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" fill="none" stroke="currentColor" />
              </svg>
            </button>

            <button
              onClick={handleShare}
              className="transition-all duration-200 hover:scale-110 active:scale-95 text-foreground/80 hover:text-foreground"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" fill="none" stroke="currentColor" />
                <path d="M12 16V3" stroke="currentColor" />
                <path d="m7 8 5-5 5 5" fill="none" stroke="currentColor" />
              </svg>
            </button>
          </div>

          <button onClick={handleSave} className="transition-all duration-200 hover:scale-110 active:scale-95 text-foreground/80 hover:text-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M5 5v14l7-5 7 5V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2Z"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm font-semibold">
          <span>{likeCount} me gusta</span>
          <span className="text-muted-foreground">·</span>
          <span>{commentCount} comentarios</span>
          {shareMessage && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{shareMessage}</span>
            </>
          )}
        </div>

        <div className="space-y-2 text-xs sm:text-sm leading-relaxed mt-2 sm:mt-3">
          <p>{parseCaption(caption)}</p>
        </div>

        {pollQuestion && safePollOptions.length > 0 && (
          <div className="mt-3 p-3 rounded-xl border border-border/60 bg-accent/40 space-y-3">
            <p className="font-semibold text-sm">{pollQuestion}</p>
            <div className="space-y-2">
              {safePollOptions.map((option, idx) => {
                const votes = pollCounts[idx] || 0;
                const totalVotes = pollCounts.reduce((a, b) => a + b, 0) || 0;
                const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                const isMine = userVote === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handlePollVote(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg border relative overflow-hidden",
                      isMine ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                      !dbUser && "cursor-not-allowed"
                    )}
                    disabled={!dbUser}
                  >
                    <div
                      className="absolute inset-0 bg-primary/10"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="relative z-10 text-sm font-medium">{option}</span>
                    <span className="relative z-10 float-right text-xs text-muted-foreground">
                      {votes} ({percent}%)
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {pollCounts.reduce((a, b) => a + b, 0)} votos
            </p>
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {commentsList.map((comment, idx) => (
              <div key={comment.id || idx} className="flex items-start gap-3">
                <Link to={`/profile?username=${comment.username}`} className="flex-shrink-0">
                  <img 
                    src={comment.avatar_url || "https://via.placeholder.com/100"} 
                    alt={comment.username}
                    className="w-8 h-8 rounded-full object-cover bg-muted"
                  />
                </Link>
                <div className="flex-1">
                  <p className="text-sm">
                    <Link 
                      to={`/profile?username=${comment.username}`}
                      className="font-semibold hover:underline"
                    >
                      {comment.username || "Usuario"}
                    </Link>{" "}
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleCommentLike(comment.id, comment.isLiked)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="transition-colors"
                      >
                        <path
                          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                          fill={comment.isLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                        />
                      </svg>
                      {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <form onSubmit={handleComment} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añade un comentario..."
                className="flex-1 bg-muted rounded-full px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                className="text-primary text-sm font-semibold disabled:opacity-50"
                disabled={!newComment.trim()}
              >
                Publicar
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
