import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { ArrowLeft, Hash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HashtagPage = () => {
    const { tag } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tag) {
            loadPosts();
        }
    }, [tag, dbUser]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const url = new URL(`http://localhost:5000/api/posts/hashtag/${tag}`);
            if (dbUser?.id) {
                url.searchParams.append('currentUserId', dbUser.id.toString());
            }

            const response = await fetch(url.toString());
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error("Error loading hashtag posts:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Hash size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">#{tag}</h1>
                            <p className="text-muted-foreground">{posts.length} publicaciones</p>
                        </div>
                    </div>
                </div>

                {/* Posts Grid */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
                        </div>
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
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
                                    comments={0} // We could fetch comment count if needed
                                    timeAgo={new Date(post.created_at).toLocaleDateString()}
                                    isLiked={post.isLiked}
                                    isSaved={post.isSaved}
                                    isPrivate={post.is_private}
                                />
                        ))
                    ) : (
                        <div className="text-center py-12 glass-card">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Hash size={32} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No hay publicaciones aún</h3>
                            <p className="text-muted-foreground">Sé el primero en publicar con #{tag}</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default HashtagPage;
