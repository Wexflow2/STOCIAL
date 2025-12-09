import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "like" | "comment" | "follow";

interface NotificationItemProps {
  type: NotificationType;
  username: string;
  avatar: string;
  content?: string;
  postImage?: string;
  timeAgo: string;
  isRead?: boolean;
}

const icons = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
};

const messages = {
  like: "le gustó tu publicación",
  comment: "comentó:",
  follow: "comenzó a seguirte",
};

export function NotificationItem({
  type,
  username,
  avatar,
  content,
  postImage,
  timeAgo,
  isRead = false,
}: NotificationItemProps) {
  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 transition-colors hover:bg-accent/50 cursor-pointer",
        !isRead && "bg-accent/30"
      )}
    >
      <div className="relative flex-shrink-0">
        <img
          src={avatar}
          alt={username}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
            type === "like" && "bg-destructive text-destructive-foreground",
            type === "comment" && "bg-chart-1 text-primary-foreground",
            type === "follow" && "bg-chart-2 text-primary-foreground"
          )}
        >
          <Icon size={12} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{username}</span>{" "}
          <span className="text-muted-foreground">{messages[type]}</span>
          {content && (
            <span className="text-foreground"> {content}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>

      {postImage && (
        <img
          src={postImage}
          alt=""
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      )}
    </div>
  );
}
