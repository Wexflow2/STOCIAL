import { cn } from "@/lib/utils";
import { Check, CheckCheck, Play, Pause, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessageProps {
  id?: number;
  content: string | React.ReactNode;
  timeAgo: string;
  isOwn?: boolean;
  read?: boolean;
  is_read?: boolean;
  reactions?: Array<{ user_id: number; emoji: string }>;
  onReaction?: (emoji: string) => void;
  type?: string;
  media_url?: string;
}

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export function ChatMessage({ id, content, timeAgo, isOwn = false, read, is_read, reactions = [], onReaction, type, media_url }: ChatMessageProps) {
  const isRead = read || is_read;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user_id);
    return acc;
  }, {} as Record<string, number[]>);

  const formatTime = (seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (type !== "audio" || !media_url) return;
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleTime = () => setProgress(audio.currentTime || 0);
    const handleEnd = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("ended", handleEnd);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("ended", handleEnd);
    };
  }, [type, media_url]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => console.error("Audio play error", err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (percent: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Math.max(0, Math.min(1, percent)) * duration;
    audio.currentTime = next;
    setProgress(next);
  };

  const audioPercent = duration ? Math.min(progress / duration, 1) : 0;
  const waveformBars = [4, 10, 6, 14, 12, 8, 16, 7, 13, 5, 11, 15, 9, 12, 6, 10];

  const renderAudio = () => {
    const bubbleBase = isOwn
      ? "bg-primary text-primary-foreground border border-primary/20"
      : "bg-muted text-foreground border border-border/70";

    const barColor = isOwn ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)";
    const inactive = isOwn ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)";

    return (
      <div className="w-full min-w-[240px] max-w-[360px]">
        <div className={cn("rounded-2xl px-3 py-2 flex items-center gap-3 shadow-inner", bubbleBase)}>
          <button
            onClick={toggleAudio}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isOwn ? "bg-white/15 hover:bg-white/25" : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-1 overflow-hidden">
              {waveformBars.map((h, idx) => {
                const barPercent = (idx + 1) / waveformBars.length;
                const active = audioPercent >= barPercent;
                return (
                  <span
                    key={idx}
                    className="block w-1 rounded-full transition-all duration-150"
                    style={{
                      height: `${h * 3}px`,
                      backgroundColor: active ? barColor : inactive,
                      opacity: active ? 0.95 : 0.35,
                    }}
                  />
                );
              })}
            </div>
            <div
              className="w-full h-1.5 rounded-full bg-white/20 dark:bg-black/20 relative cursor-pointer group"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                handleSeek(pct);
              }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/80 dark:bg-primary transition-all"
                style={{ width: `${audioPercent * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white dark:bg-primary shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${audioPercent * 100}%` }}
              />
            </div>
          </div>

          <span className={cn("text-xs font-semibold whitespace-nowrap", isOwn ? "text-white/90" : "text-foreground/80")}>
            {formatTime(duration || progress)}
          </span>

          <audio ref={audioRef} src={media_url} className="hidden" preload="auto" />
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex group", isOwn ? "justify-end" : "justify-start")}>
      <div className="relative max-w-[85%] lg:max-w-[70%]">
        <div
          className={cn(
            "rounded-2xl shadow-sm",
            type === "audio"
              ? "p-0"
              : "px-3 py-2 lg:px-4 lg:py-2",
            type === "audio"
              ? ""
              : isOwn
                ? "bg-foreground text-background rounded-br-sm"
                : "bg-muted/80 rounded-bl-sm border border-border/30"
          )}
        >
          {type === 'image' && media_url ? (
            <img 
              src={media_url} 
              alt="Imagen" 
              className="max-w-full rounded-lg max-h-[300px] lg:max-h-[400px] object-cover" 
            />
          ) : type === 'audio' && media_url ? (
            renderAudio()
          ) : (
            <p className="text-[15px] lg:text-sm break-words leading-relaxed">{content}</p>
          )}
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] mt-1",
              isOwn ? "text-background/60" : "text-muted-foreground"
            )}
          >
            <span>{timeAgo}</span>
            {isOwn && (
              isRead ? (
                <CheckCheck size={13} className="text-blue-400" />
              ) : (
                <Check size={13} />
              )
            )}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, users]) => (
              <div
                key={emoji}
                className="px-2 py-1 lg:py-0.5 rounded-full bg-accent text-xs flex items-center gap-1 cursor-pointer active:scale-95 hover:bg-accent/80 transition-all min-h-[28px] lg:min-h-0"
                onClick={() => onReaction?.(emoji)}
              >
                <span className="text-base lg:text-sm">{emoji}</span>
                <span className="text-[10px] font-medium">{users.length}</span>
              </div>
            ))}
          </div>
        )}

        {/* Emoji picker button */}
        {id && (
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "absolute -top-2 p-1.5 lg:p-1 rounded-full bg-card border border-border transition-all",
              "opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
              "active:scale-95",
              isOwn ? "-left-9 lg:-left-8" : "-right-9 lg:-right-8"
            )}
          >
            <Smile size={16} className="lg:w-[14px] lg:h-[14px]" />
          </button>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 z-[9] lg:hidden" 
              onClick={() => setShowEmojiPicker(false)}
            />
            
            <div className={cn(
              "absolute z-10 flex gap-2 lg:gap-1 p-3 lg:p-2 rounded-xl lg:rounded-lg bg-card border border-border shadow-xl",
              isOwn ? "right-0 top-full mt-2 lg:mt-1" : "left-0 top-full mt-2 lg:mt-1"
            )}>
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction?.(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl lg:text-lg hover:scale-125 active:scale-110 transition-transform min-w-[40px] min-h-[40px] lg:min-w-0 lg:min-h-0 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
