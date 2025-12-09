import { cn } from "@/lib/utils";

interface ConversationItemProps {
  avatar: string;
  username: string;
  lastMessage: string;
  timeAgo: string;
  unreadCount?: number;
  isActive?: boolean;
  isOnline?: boolean;
}

export function ConversationItem({
  avatar,
  username,
  lastMessage,
  timeAgo,
  unreadCount = 0,
  isActive = false,
  isOnline = false,
}: ConversationItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 lg:p-4 cursor-pointer transition-all",
        isActive ? "bg-accent" : "hover:bg-accent/50",
        "min-h-[72px]"
      )}
    >
      <div className="relative flex-shrink-0">
        <img
          src={avatar}
          alt={username}
          className="w-14 h-14 lg:w-12 lg:h-12 rounded-full object-cover"
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className={cn(
            "font-medium text-[15px] lg:text-sm truncate",
            unreadCount > 0 && "text-foreground font-semibold"
          )}>
            {username}
          </p>
          <span className="text-[11px] lg:text-xs text-muted-foreground flex-shrink-0 ml-2">{timeAgo}</span>
        </div>
        <p className={cn(
          "text-sm lg:text-sm truncate leading-tight",
          unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {lastMessage}
        </p>
      </div>

      {unreadCount > 0 && (
        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </div>
  );
}
