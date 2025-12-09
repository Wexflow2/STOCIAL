import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface SuggestedUserProps {
  id: number;
  username: string;
  name: string;
  avatar: string;
  reason?: string;
  followStatus?: string | null;
  isFollowingInitial?: boolean;
}

export function SuggestedUser({ id, username, name, avatar, reason = "Sugerencia para ti", followStatus, isFollowingInitial }: SuggestedUserProps) {
  const { dbUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState<boolean>(isFollowingInitial || followStatus === "accepted");
  const [isPending, setIsPending] = useState<boolean>(followStatus === "pending");
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!dbUser?.id || isFollowing || isPending) return;
    setIsLoading(true);
    try {
      const response = await fetch("https://stocial.eliverdiaz72.workers.dev/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: id, follower_id: dbUser.id }),
      });
      if (response.ok) {
        const data = await response.json();
        setIsPending(data.status === "pending");
        setIsFollowing(data.status === "accepted");
      }
    } catch (err) {
      console.error("Error following suggested user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <img
          src={avatar}
          alt={username}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{username}</p>
          <p className="text-xs text-muted-foreground truncate">{reason}</p>
        </div>
      </div>
      <button
        onClick={handleFollow}
        className={cn(
          "text-xs font-semibold px-4 py-1.5 rounded-lg transition-all",
          isFollowing || isPending
            ? "bg-muted text-muted-foreground cursor-default"
            : "bg-foreground text-background hover:opacity-90",
          isLoading && "opacity-60 cursor-wait"
        )}
        disabled={isFollowing || isPending || isLoading}
      >
        {isPending ? "Pendiente" : isFollowing ? "Siguiendo" : "Seguir"}
      </button>
    </div>
  );
}
