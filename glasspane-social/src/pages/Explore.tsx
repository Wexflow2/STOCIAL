import { useState, useEffect } from "react";
import { Search, Flame, UserPlus, Image, Video } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const Explore = () => {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"trending" | "users">("trending");
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (q: string) => {
    setLoading(true);
    try {
      const url = new URL('https://stocial.eliverdiaz72.workers.dev/api/search-users');
      url.searchParams.append('q', q || '%');
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    setLoading(true);
    try {
      const url = new URL('https://stocial.eliverdiaz72.workers.dev/api/posts/trending');
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setTrendingPosts(data);
      }
    } catch (error) {
      console.error("Error loading trending posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: number) => {
    try {
      const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: userId, follower_id: dbUser?.id })
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u));
      }
    } catch (error) {
      console.error("Error following:", error);
    }
  };

  useEffect(() => {
    loadTrending();
    searchUsers('');
  }, [dbUser]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Explorar</h1>
            <p className="text-xs sm:text-base text-muted-foreground">Descubre nuevo contenido en Sotiale</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-4 sm:mb-6">
          <div className="glass-input flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-full shadow-md">
            <Search size={18} className="text-muted-foreground sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar usuarios, hashtags, contenido..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab === 'users') searchUsers(e.target.value);
              }}
              className="flex-1 bg-transparent outline-none text-xs sm:text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6 border-b border-border pb-3 sm:pb-4">
          <button
            onClick={() => setActiveTab("trending")}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 pb-2 font-semibold text-xs sm:text-sm transition-colors border-b-2",
              activeTab === "trending"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame size={16} className="sm:w-[18px] sm:h-[18px]" />
            Tendencias
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 pb-2 font-semibold text-xs sm:text-sm transition-colors border-b-2",
              activeTab === "users"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
            Usuarios
          </button>
        </div>

        {/* Media Filter for Trending */}
        {activeTab === "trending" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMediaFilter("all")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                mediaFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setMediaFilter("image")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                mediaFilter === "image"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <Image size={16} />
              Fotos
            </button>
            <button
              onClick={() => setMediaFilter("video")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                mediaFilter === "video"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <Video size={16} />
              Videos
            </button>
          </div>
        )}

        {activeTab === 'users' ? (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 glass-card rounded-lg cursor-pointer"
                onClick={() => navigate(`/profile?username=${user.username}`)}
              >
                <div className="flex items-center gap-3">
                  <img src={user.avatar_url || user.profile_picture_url || "https://via.placeholder.com/100"} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(user.id);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    user.followStatus === 'pending'
                      ? "bg-muted text-foreground border border-border cursor-not-allowed"
                      : user.isFollowing
                        ? "bg-muted text-foreground border border-border"
                        : "bg-foreground text-background"
                  )}
                  disabled={user.followStatus === 'pending'}
                >
                  {user.followStatus === 'pending' ? "Pendiente" : user.isFollowing ? "Siguiendo" : "Seguir"}
                </button>
              </div>
            ))}
            {users.length === 0 && searchQuery && (
              <p className="text-center text-muted-foreground">No se encontraron usuarios</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden">
            <ExploreGrid posts={trendingPosts
              .filter(p => {
                if (mediaFilter === "all") return true;
                if (mediaFilter === "image") return !p.media_type || p.media_type === "image";
                if (mediaFilter === "video") return p.media_type === "video";
                return true;
              })
              .map((p: any) => ({
                id: p.id,
                imageUrl: p.image_url || p.media_url,
                type: p.media_type || "image",
              }))} />
            {trendingPosts.filter(p => {
              if (mediaFilter === "all") return true;
              if (mediaFilter === "image") return !p.media_type || p.media_type === "image";
              if (mediaFilter === "video") return p.media_type === "video";
              return true;
            }).length === 0 && (
              <p className="text-center text-muted-foreground py-6">
                No hay {mediaFilter === "image" ? "fotos" : mediaFilter === "video" ? "videos" : "posts"} en tendencia todavía.
              </p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
