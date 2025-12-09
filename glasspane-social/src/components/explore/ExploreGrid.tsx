import { cn } from "@/lib/utils";

interface ExplorePost {
  id: string;
  imageUrl: string;
  type: "image" | "video" | "carousel";
}

interface ExploreGridProps {
  posts: ExplorePost[];
}

export function ExploreGrid({ posts }: ExploreGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post, index) => {
        const isLarge = index % 10 === 0 || index % 10 === 5;
        
        return (
          <div
            key={post.id}
            className={cn(
              "aspect-square bg-muted overflow-hidden cursor-pointer group relative",
              isLarge && "col-span-2 row-span-2"
            )}
          >
            <img
              src={post.imageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
          </div>
        );
      })}
    </div>
  );
}
