import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PostView = () => {
    const { id } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadPost();
        }
    }, [id, dbUser]);

    const loadPost = async () => {
        setLoading(true);
        try {
            const url = new URL(`https://stocial.eliverdiaz72.workers.dev/api/posts/view/${id}`);
            if (dbUser?.id) {
                url.searchParams.append('currentUserId', dbUser.id.toString());
            }

            const response = await fetch(url.toString());
            if (response.ok) {
                const data = await response.json();
                setPost(data);
            } else {
                console.error("Post not found");
            }
        } catch (error) {
            console.error("Error loading post:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto py-6 px-4">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 hover:bg-accent rounded-full transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Volver</span>
                </button>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
                    </div>
                ) : post ? (
                    <PostCard
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
                      onDeleted={() => navigate(-1)}
                    />
                ) : (
                    <div className="text-center py-12 glass-card">
                        <h3 className="text-xl font-semibold mb-2">Publicación no encontrada</h3>
                        <p className="text-muted-foreground">Es posible que haya sido eliminada</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default PostView;
