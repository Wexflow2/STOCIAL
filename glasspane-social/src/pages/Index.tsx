import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StoryCircle } from "@/components/feed/StoryCircle";
import { PostCard } from "@/components/feed/PostCard";
import { SuggestedUser } from "@/components/feed/SuggestedUser";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { CreateStory } from "@/components/stories/CreateStory";
import { useLocale } from "@/context/LocaleContext";

const Index = () => {
  const { dbUser, user } = useAuth();
  const { t } = useLocale();
  const { socket } = useSocket();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Stories state
  const [stories, setStories] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [seenStories, setSeenStories] = useState<Set<number>>(new Set());

  const seenKey = useMemo(() => dbUser?.id ? `stories_seen_${dbUser.id}` : null, [dbUser?.id]);

  useEffect(() => {
    if (!seenKey) return;
    try {
      const raw = localStorage.getItem(seenKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = Array.isArray(parsed) ? parsed.map((n) => Number(n)).filter((n) => !Number.isNaN(n)) : [];
        setSeenStories(new Set(normalized));
      } else {
        setSeenStories(new Set());
      }
    } catch (err) {
      console.error("Error parsing seen stories:", err);
    }
  }, [seenKey]);

  useEffect(() => {
    if (dbUser?.id) {
      loadFeed();
      loadSuggestedUsers();
      loadStories();
    }
  }, [dbUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_post', (newPost: any) => {
      const postWithUser = {
        ...newPost,
        username: newPost.username || dbUser?.username || "Usuario",
        avatar_url: newPost.avatar_url || dbUser?.profile_picture_url || "https://via.placeholder.com/100"
      };

      setFeedPosts((prevPosts) => [postWithUser, ...prevPosts]);
    });

    socket.on('new_story', () => {
      loadStories();
      // Mark own story as unseen so the ring turns blue again
      if (dbUser?.id) {
        setSeenStories((prev) => {
          const next = new Set(prev);
          next.delete(dbUser.id);
          if (seenKey) localStorage.setItem(seenKey, JSON.stringify(Array.from(next)));
          return next;
        });
      }
    });

    return () => {
      socket.off('new_post');
      socket.off('new_story');
    };
  }, [socket, dbUser]);

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const url = new URL('https://stocial.eliverdiaz72.workers.dev/api/feed');
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const posts = await response.json();
        setFeedPosts(posts);
      }
    } catch (error) {
      console.error('Error cargando feed:', error);
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const url = new URL('https://stocial.eliverdiaz72.workers.dev/api/users/suggested');
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  const loadStories = async () => {
    if (!dbUser?.id) return;
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/stories/feed?currentUserId=${dbUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error("Error loading stories:", error);
    }
  };

  const markStoriesSeen = (userId: number) => {
    setSeenStories((prev) => {
      const next = new Set(prev);
      next.add(userId);
      if (seenKey) localStorage.setItem(seenKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const markStoriesUnseen = (userId: number) => {
    setSeenStories((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      if (seenKey) localStorage.setItem(seenKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleStoryClick = (index: number) => {
    setInitialStoryIndex(index);
    setShowStoryViewer(true);
  };

  const myStoryIndex = stories.findIndex((s) => s.user_id === dbUser?.id);
  const myStory = myStoryIndex >= 0 ? stories[myStoryIndex] : null;
  const otherStories = stories.filter((s) => s.user_id !== dbUser?.id);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Main Feed */}
          <div className="flex-1 max-w-xl">
            {/* Stories */}
            <div className="glass-card p-4 mb-6">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {/* My Story (single circle for create + view) */}
                <StoryCircle
                  imageUrl={dbUser?.profile_picture_url || dbUser?.avatar_url || user?.photoURL || "https://via.placeholder.com/100"}
                  username={t("yourStory")}
                  isOwn
                  hasStory={!!myStory}
                  hasUnseen={!!myStory && !seenStories.has(dbUser?.id || 0)}
                  accent="blue"
                  onClick={() => {
                    if (myStoryIndex >= 0) {
                      handleStoryClick(myStoryIndex);
                    } else {
                      setShowCreateStory(true);
                    }
                  }}
                />

                {/* Other Stories */}
                {otherStories.map((storyUser, index) => (
                  <StoryCircle
                    key={storyUser.user_id}
                    imageUrl={storyUser.avatar_url}
                    username={storyUser.username}
                    hasUnseen={!seenStories.has(storyUser.user_id)}
                    hasStory
                    onClick={() => {
                      const originalIndex = stories.findIndex((s) => s.user_id === storyUser.user_id);
                      handleStoryClick(originalIndex >= 0 ? originalIndex : index);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-0 sm:space-y-6">
              {loadingFeed ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
                </div>
              ) : feedPosts.length > 0 ? (
                feedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    userId={post.user_id}
                    username={post.username}
                    userAvatar={post.profile_picture_url || post.avatar_url || "https://via.placeholder.com/100"}
                    imageUrl={post.image_url || post.media_url}
                    mediaUrl={post.media_url || post.image_url}
                    mediaType={post.media_type}
                    pollQuestion={post.poll_question}
                    pollOptions={post.poll_options}
                    pollVotes={post.poll_votes}
                    caption={post.caption || ""}
                    likes={post.likes_count || 0}
                    comments={0}
                    timeAgo={new Date(post.created_at).toLocaleDateString()}
                    isLiked={post.isLiked}
                    isSaved={post.isSaved}
                    isPrivate={post.is_private}
                    onDeleted={() =>
                      setFeedPosts((prev) => prev.filter((p) => p.id !== post.id))
                    }
                  />
                ))
              ) : (
                <div className="glass-card p-8 sm:p-12 text-center mx-4 sm:mx-0">
                  <h3 className="text-lg sm:text-xl font-bold mb-2">No hay publicaciones aún</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">Sigue a otros usuarios para ver sus publicaciones aquí</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-6">
              {/* Profile preview */}
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={dbUser?.profile_picture_url || user?.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-sm">@{dbUser?.username || "usuario"}</p>
                  <p className="text-sm text-muted-foreground">{dbUser?.name || "Usuario Sotiale"}</p>
                </div>
              </div>

              {/* Suggested users */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Sugerencias para ti
                  </h3>
                  <button className="text-xs font-semibold hover:opacity-70 transition-opacity">
                    Ver todo
                  </button>
                </div>
                <div className="space-y-1">
                  {suggestedUsers.length > 0 ? (
                    suggestedUsers.map((user) => (
                      <SuggestedUser key={user.id} {...user} />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No hay sugerencias disponibles</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-xs text-muted-foreground space-y-4">
                <div className="flex flex-wrap gap-2">
                  <a href="#" className="hover:underline">Acerca de</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Ayuda</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Privacidad</a>
                  <span>·</span>
                  <a href="#" className="hover:underline">Condiciones</a>
                </div>
                <p>© 2024 Sotiale</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modals */}
      {showStoryViewer && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialUserIndex={initialStoryIndex}
          onClose={() => setShowStoryViewer(false)}
          onUserStoriesSeen={markStoriesSeen}
        />
      )}

      {showCreateStory && (
        <CreateStory
          onClose={() => setShowCreateStory(false)}
          onStoryCreated={() => {
            loadStories();
            if (dbUser?.id) {
              markStoriesUnseen(dbUser.id);
            }
          }}
        />
      )}
    </MainLayout>
  );
};

export default Index;
