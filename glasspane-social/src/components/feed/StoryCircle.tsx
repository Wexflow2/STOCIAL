import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface StoryCircleProps {
  imageUrl: string;
  username: string;
  isOwn?: boolean;
  hasUnseen?: boolean;
  hasStory?: boolean;
  accent?: "blue" | "gradient";
  onClick?: () => void;
}

export function StoryCircle({ imageUrl, username, isOwn, hasUnseen, hasStory, accent = "gradient", onClick }: StoryCircleProps) {
  const ringClass = accent === "blue"
    ? (hasStory && hasUnseen ? "bg-gradient-to-tr from-sky-400 via-blue-500 to-blue-600" : "bg-border")
    : (hasUnseen ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600" : "bg-border");

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={onClick}>
      <div className={cn(
        "p-[3px] rounded-full transition-all duration-300 group-hover:scale-105 relative",
        ringClass
      )}>
        <div className="p-[2px] bg-background rounded-full">
          <img
            src={imageUrl}
            alt={username}
            className="w-16 h-16 rounded-full object-cover"
          />
        </div>
        {isOwn && (
          <div className="absolute bottom-0 right-0 bg-foreground text-background p-1 rounded-full border-2 border-background shadow-md">
            <Plus className="w-3 h-3" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-muted-foreground truncate w-20 text-center">
        {username}
      </span>
    </div>
  );
}
