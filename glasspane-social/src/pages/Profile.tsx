import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Settings, Grid3X3, Bookmark, Heart, Lock, Link2, MapPin, Globe, ExternalLink, Sparkles, Plus, X, Camera, Shield } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateUser, getSocialLinks, createSocialLink, deleteSocialLink } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { parseCaption } from "@/lib/parseCaption";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { VerifiedBadge, isVerifiedUser } from "@/components/VerifiedBadge";

type ProfileTab = "posts" | "saved" | "liked" | "private";
type SocialLink = {
  id?: number;
  platform: string;
  url: string;
  isNew?: boolean;
  isDirty?: boolean;
};

const Profile = () => {
  const { dbUser, user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const usernameParam = searchParams.get("username");

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [linksToDelete, setLinksToDelete] = useState<number[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [profileStoryUser, setProfileStoryUser] = useState<any | null>(null);
  const [showProfileStoryViewer, setShowProfileStoryViewer] = useState(false);
  const [seenStories, setSeenStories] = useState<Set<number>>(new Set());
  const [profileData, setProfileData] = useState({
    username: "",
    name: "",
    bio: "",
    followers: "0",
    following: "0",
    posts: "0",
    profilePictureUrl: "",
    coverImageUrl: "",
    website: "",
    location: "",
    id: 0,
    isFollowing: false,
    followStatus: null as string | null,
    usernameChanged: false,
  });
  const seenKey = useMemo(() => dbUser?.id ? `stories_seen_${dbUser.id}` : null, [dbUser?.id]);

  useEffect(() => {
    if (usernameParam) {
      loadUserProfile(usernameParam);
    } else if (dbUser) {
      setProfileData({
        username: dbUser.username || "",
        name: dbUser.name || "",
        bio: dbUser.bio || "",
        followers: dbUser.followers_count?.toString() || "0",
        following: "0",
        posts: "0",
        profilePictureUrl: dbUser.profile_picture_url || dbUser.avatar_url || user?.photoURL || "https://via.placeholder.com/300",
        coverImageUrl: dbUser.cover_image_url || "",
        website: dbUser.website || "",
        location: dbUser.location || "",
        id: dbUser.id,
        isFollowing: false,
        followStatus: null,
        usernameChanged: dbUser.username_changed || false,
      });
      loadUserPosts(dbUser.id);
      loadFollowingCount(dbUser.id);
      loadStoryStatus(dbUser.id);
    }
  }, [dbUser, user, usernameParam]);

  useEffect(() => {
    if (!seenKey) return;
    try {
      const raw = localStorage.getItem(seenKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = Array.isArray(parsed) ? parsed.map((n: any) => Number(n)).filter((n) => !Number.isNaN(n)) : [];
        setSeenStories(new Set(normalized));
      } else {
        setSeenStories(new Set());
      }
    } catch (err) {
      console.error("Error parsing seen stories:", err);
    }
  }, [seenKey]);

  const loadFollowingCount = async (userId: number) => {
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/users/${userId}/following`);
      if (response.ok) {
        const data = await response.json();
        setProfileData((prev) => ({ ...prev, following: data.length.toString() }));
      }
    } catch (error) {
      console.error("Error loading following count:", error);
    }
  };

  const loadUserProfile = async (username: string) => {
    try {
      const searchUrl = new URL(`https://stocial.eliverdiaz72.workers.dev/api/search-users`);
      searchUrl.searchParams.set("q", username);
      if (dbUser?.id) {
        searchUrl.searchParams.set("currentUserId", dbUser.id.toString());
      }

      const response = await fetch(searchUrl.toString());
      if (response.ok) {
        const data = await response.json();
        const foundUser = data.users.find((u: any) => u.username === username);

        if (foundUser) {
          let detailedUser = foundUser;

          try {
            const detailResponse = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/users/${foundUser.id}`);
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              detailedUser = { ...foundUser, ...detailData };
            }
          } catch (detailError) {
            console.error("Error loading detailed user profile:", detailError);
          }

          const isPrivate = foundUser.is_private || false;
          const isOwnProfile = dbUser?.id === foundUser.id;
          const isFollowing = foundUser.followStatus === "accepted";

          setIsPrivateAccount(isPrivate);
          setCanViewPosts(isOwnProfile || !isPrivate || isFollowing);

          setProfileData({
            username: detailedUser.username,
            name: detailedUser.name,
            bio: detailedUser.bio,
            followers: (detailedUser.followers || detailedUser.followers_count || 0).toString(),
            following: "0",
            posts: "0",
            profilePictureUrl: detailedUser.profile_picture_url || detailedUser.avatar || "https://via.placeholder.com/300",
            coverImageUrl: detailedUser.cover_image_url || "",
            website: detailedUser.website || "",
            location: detailedUser.location || "",
            id: detailedUser.id,
            isFollowing: foundUser.isFollowing,
            followStatus: foundUser.followStatus || null,
            usernameChanged: detailedUser.username_changed || false,
          });
          loadUserPosts(foundUser.id);
          loadFollowingCount(foundUser.id);
          if (dbUser?.id) {
            loadStoryStatus(foundUser.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadUserPosts = async (userId: number) => {
    if (!userId) return;

    setLoadingPosts(true);
    try {
      let endpoint = `https://stocial.eliverdiaz72.workers.dev/api/posts/${userId}`;
      if (activeTab === "saved") {
        endpoint = `https://stocial.eliverdiaz72.workers.dev/api/users/${userId}/saved-posts`;
      } else if (activeTab === "liked") {
        endpoint = `https://stocial.eliverdiaz72.workers.dev/api/users/${userId}/liked-posts`;
      }

      const url = new URL(endpoint);
      if (dbUser?.id) {
        url.searchParams.append("currentUserId", dbUser.id.toString());
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const posts = await response.json();
        let filtered = posts;
        if (activeTab === "posts") {
          filtered = posts.filter((p: any) => !p.is_private);
        } else if (activeTab === "private") {
          filtered = posts.filter((p: any) => p.is_private);
        }
        setUserPosts(filtered);
        if (activeTab === "posts") {
          setProfileData((prev) => ({ ...prev, posts: filtered.length.toString() }));
        }
      }
    } catch (error) {
      console.error("Error cargando publicaciones:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadStoryStatus = async (targetUserId: number) => {
    if (!dbUser?.id) return;
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/stories/feed?currentUserId=${dbUser.id}`);
      if (response.ok) {
        const data = await response.json();
        const found = data.find((entry: any) => entry.user_id === targetUserId) || null;
        setProfileStoryUser(found);
      }
    } catch (error) {
      console.error("Error loading story status:", error);
    }
  };

  const loadSocialLinks = async (userId: number) => {
    if (!userId) return;
    setLoadingLinks(true);
    try {
      const response = await getSocialLinks(userId);
      const links = (response as any).data || response;
      setSocialLinks(
        (links || []).map((link: SocialLink) => ({
          ...link,
          isNew: false,
          isDirty: false,
        }))
      );
      setLinksToDelete([]);
    } catch (error) {
      console.error("Error loading social links:", error);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (profileData.id) {
      loadUserPosts(profileData.id);
    }
  }, [activeTab, profileData.id]);

  useEffect(() => {
    if (profileData.id) {
      loadSocialLinks(profileData.id);
      if (dbUser?.id) {
        loadStoryStatus(profileData.id);
      }
    }
  }, [profileData.id, dbUser?.id]);

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const syncSocialLinks = async () => {
    if (!dbUser?.id) return;

    const cleanedLinks = socialLinks
      .map((link) => {
        const platform = link.platform.trim();
        const rawUrl = link.url.trim();
        const safeUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`) : "";

        return {
          ...link,
          platform,
          url: safeUrl,
        };
      })
      .filter((link) => link.platform && link.url);

    const updatedIds = cleanedLinks
      .filter((link) => link.id && link.isDirty)
      .map((link) => link.id!) as number[];

    const deletions = Array.from(new Set([...linksToDelete, ...updatedIds]));

    if (deletions.length) {
      await Promise.all(deletions.map((id) => deleteSocialLink(id, dbUser.id)));
    }

    const additions = cleanedLinks.filter(
      (link) => !link.id || link.isNew || link.isDirty
    );

    if (additions.length) {
      await Promise.all(
        additions.map((link) =>
          createSocialLink(dbUser.id, link.platform, link.url)
        )
      );
    }

    await loadSocialLinks(dbUser.id);
    setLinksToDelete([]);
  };

  const handleSaveProfile = async () => {
    if (!dbUser?.id) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await updateUser(dbUser.id, {
        username: profileData.username,
        name: profileData.name,
        bio: profileData.bio,
        website: profileData.website,
        location: profileData.location,
        profile_picture_url: profileData.profilePictureUrl,
        cover_image_url: profileData.coverImageUrl,
      });
      
      const updatedData = {
        ...profileData,
        username: response.data.username || profileData.username,
        name: response.data.name || profileData.name,
        bio: response.data.bio || profileData.bio,
        website: response.data.website || profileData.website,
        location: response.data.location || profileData.location,
        profilePictureUrl: response.data.profile_picture_url || profileData.profilePictureUrl,
        coverImageUrl: response.data.cover_image_url || profileData.coverImageUrl,
        usernameChanged: response.data.username_changed || profileData.usernameChanged,
      };
      
      setProfileData(updatedData);
      await syncSocialLinks();
      await refreshUser();
      
      setSaveMessage({ type: 'success', text: '✅ Perfil actualizado correctamente' });
      
      setTimeout(() => {
        setIsEditDialogOpen(false);
        setSaveMessage(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error.response?.data?.error || 'Error al actualizar el perfil. Inténtalo de nuevo.';
      setSaveMessage({ type: 'error', text: `❌ ${errorMessage}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollow = async () => {
    if (!profileData.id || !dbUser?.id) return;

    try {
      const response = await fetch("https://stocial.eliverdiaz72.workers.dev/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: profileData.id, follower_id: dbUser.id }),
      });

      if (response.ok) {
        const data = await response.json();
        const nextStatus = data.status || null;

        setProfileData((prev) => ({
          ...prev,
          isFollowing: nextStatus === "accepted",
          followStatus: nextStatus,
          followers: (() => {
            const currentFollowers = parseInt(prev.followers) || 0;

            if (nextStatus === "pending") return currentFollowers.toString();
            if (nextStatus === null) {
              return Math.max(0, currentFollowers - (prev.followStatus === "accepted" ? 1 : 0)).toString();
            }
            if (nextStatus === "accepted" && prev.followStatus !== "accepted") {
              return (currentFollowers + 1).toString();
            }
            return currentFollowers.toString();
          })(),
        }));
      }
    } catch (error) {
      console.error("Error following:", error);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, profilePictureUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, coverImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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

  const handleAddLink = () => {
    setSocialLinks((prev) => [
      ...prev,
      { platform: "", url: "", isNew: true, isDirty: true },
    ]);
  };

  const handleLinkChange = (index: number, field: "platform" | "url", value: string) => {
    setSocialLinks((prev) =>
      prev.map((link, i) =>
        i === index
          ? { ...link, [field]: value, isDirty: link.id ? true : link.isDirty ?? true }
          : link
      )
    );
  };

  const handleRemoveLink = (index: number) => {
    setSocialLinks((prev) => {
      const target = prev[index];
      if (target?.id) {
        setLinksToDelete((ids) => Array.from(new Set([...ids, target.id!])));
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const isOwnProfile = !usernameParam || usernameParam === dbUser?.username;
  const visibleLinks = socialLinks.filter((link) => link.platform && link.url);
  const hasProfileStory = !!profileStoryUser;
  const hasUnseenProfileStory = !!profileStoryUser && !seenStories.has(profileStoryUser.user_id);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="glass-card overflow-hidden scale-up">
          <div className="relative">
            <div className="w-full h-44 md:h-56 bg-gradient-to-br from-primary/25 via-accent/20 to-background">
              {profileData.coverImageUrl ? (
                <img
                  src={profileData.coverImageUrl}
                  alt="Portada del perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-between h-full px-6 md:px-10 text-muted-foreground">
                  <span className="text-sm font-medium">Personaliza tu portada para darle carácter.</span>
                  <Sparkles size={18} className="text-primary hidden md:block" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent pointer-events-none" />
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-2">
              {isOwnProfile && (
                <button
                  onClick={handleEditProfile}
                  className="px-3 py-2 rounded-xl bg-background/80 border border-border/60 text-sm font-semibold flex items-center gap-2 hover:scale-105 transition-all duration-300 shadow-sm"
                >
                  <Camera size={16} />
                  Cambiar portada
                </button>
              )}
              <div className="px-3 py-1.5 rounded-full bg-background/70 text-xs font-semibold flex items-center gap-1 shadow-sm">
                <Sparkles size={14} className="text-primary" />
                {profileData.posts} momentos
              </div>
            </div>
            <div className="absolute left-4 md:left-8 -bottom-12 md:-bottom-14 flex items-center gap-3">
              <div className="relative">
                <div
                  className={cn(
                    "w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-xl bg-background profile-avatar-glow ring-4 ring-background",
                    hasProfileStory && "ring-sky-400/80"
                  )}
                >
                  <img
                    src={profileData.profilePictureUrl}
                    alt={`Foto de perfil de ${profileData.username || "usuario"}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {hasProfileStory && (
                  <button
                    onClick={() => setShowProfileStoryViewer(true)}
                    className={cn(
                      "absolute inset-0 rounded-2xl border-2 border-transparent hover:border-sky-400/60 transition-all",
                      hasUnseenProfileStory && "animate-pulse"
                    )}
                    aria-label="Ver historia"
                  />
                )}
                {isOwnProfile && (
                  <button
                    onClick={handleEditProfile}
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 transition"
                    title="Editar foto"
                  >
                    <Camera size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-16 md:pt-20 px-4 md:px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-start">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {profileData.username || "usuario"}
                        {isVerifiedUser(profileData.username) && <VerifiedBadge variant="blue" />}
                      </h1>
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
                        <Sparkles size={14} />
                        Perfil activo
                      </span>
                    </div>
                    <p className="text-muted-foreground text-base">{profileData.name || "Agrega tu nombre"}</p>
                  </div>
                  <div className="flex gap-2 md:ml-auto">
                    {isOwnProfile ? (
                      <>
                        <button
                          onClick={handleEditProfile}
                          className="px-8 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:scale-105 hover:shadow-lg transition-all duration-300"
                        >
                          Editar perfil
                        </button>
                        <button
                          onClick={() => navigate("/settings")}
                          className="w-11 h-11 rounded-xl glass-button flex items-center justify-center hover:scale-105 transition-all duration-300"
                        >
                          <Settings size={20} />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleFollow}
                          className={cn(
                            "px-8 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105",
                            profileData.followStatus === "pending"
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : profileData.isFollowing
                                ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                                : "bg-foreground text-background hover:shadow-lg"
                          )}
                          disabled={profileData.followStatus === "pending"}
                        >
                          {profileData.followStatus === "pending"
                            ? "Pendiente"
                            : profileData.isFollowing
                              ? "Siguiendo"
                              : "Seguir"}
                        </button>
                        {profileData.isFollowing && (
                          <button
                            onClick={() => navigate("/messages")}
                            className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 hover:shadow-lg transition-all duration-300"
                          >
                            Mensaje
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {profileData.location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60">
                      <MapPin size={14} /> {profileData.location}
                    </span>
                  )}
                  {profileData.website && (
                    <a
                      href={profileData.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      <Globe size={14} /> {profileData.website}
                    </a>
                  )}
                  {visibleLinks.map((link, idx) => (
                    <a
                      key={`${link.platform}-${idx}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition"
                    >
                      <Link2 size={14} />
                      {link.platform}
                    </a>
                  ))}
                  {!visibleLinks.length && isOwnProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-xs font-semibold hover:bg-accent"
                    >
                      <Plus size={14} />
                      Añade tus enlaces
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-accent/50 border border-border/60 shadow-inner hover:-translate-y-1 transition cursor-default">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Publicaciones</p>
                    <p className="font-bold text-2xl gradient-text mt-1">{profileData.posts}</p>
                  </div>
                  <button
                    className="p-4 rounded-xl bg-accent/50 border border-border/60 shadow-inner hover:-translate-y-1 transition text-left"
                    onClick={() => setIsFollowersModalOpen(true)}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Seguidores</p>
                    <p className="font-bold text-2xl gradient-text mt-1">{profileData.followers}</p>
                  </button>
                  <button
                    className="p-4 rounded-xl bg-accent/50 border border-border/60 shadow-inner hover:-translate-y-1 transition text-left"
                    onClick={() => setIsFollowingModalOpen(true)}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Siguiendo</p>
                    <p className="font-bold text-2xl gradient-text mt-1">{profileData.following}</p>
                  </button>
                </div>

                <div className="text-base text-foreground/80 leading-relaxed max-w-3xl">
                  <p className="whitespace-pre-wrap">{profileData.bio || "✨ Añade una bio para contar quién eres."}</p>
                </div>

                {visibleLinks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground/80">Enlaces destacados</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {visibleLinks.map((link, idx) => (
                        <a
                          key={`${link.platform}-${idx}-card`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-4 rounded-xl border border-border/60 bg-card/70 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {link.platform.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{link.platform}</p>
                              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                            </div>
                          </div>
                          <ExternalLink size={16} className="text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center border-b border-border/50">
          <button
            onClick={() => setActiveTab("posts")}
            className={cn(
              "flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-all duration-300 tab-indicator",
              activeTab === "posts"
                ? "text-foreground active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3X3 size={18} />
            Publicaciones
          </button>
          {dbUser?.id === profileData.id && (
            <button
              onClick={() => setActiveTab("private")}
              className={cn(
                "flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-all duration-300 tab-indicator",
                activeTab === "private"
                  ? "text-foreground active"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield size={18} />
              Privados
            </button>
          )}
          <button
            onClick={() => setActiveTab("saved")}
            className={cn(
              "flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-all duration-300 tab-indicator",
              activeTab === "saved"
                ? "text-foreground active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark size={18} />
            Guardados
          </button>
          <button
            onClick={() => setActiveTab("liked")}
            className={cn(
              "flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-all duration-300 tab-indicator",
              activeTab === "liked"
                ? "text-foreground active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart size={18} />
            Me gusta
          </button>
        </div>

        {!canViewPosts && isPrivateAccount && usernameParam ? (
          <div className="glass-card p-10 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Esta cuenta es privada</h3>
            <p className="text-sm text-muted-foreground">
              Sigue a esta cuenta para ver sus publicaciones.
            </p>
          </div>
        ) : loadingPosts ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground" />
          </div>
        ) : userPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 md:gap-1.5">
            {userPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square overflow-hidden rounded-md bg-muted hover:ring-2 hover:ring-primary/20 transition-all duration-300"
              >
                {post.media_type === "video" ? (
                  <video
                    src={post.image_url || post.media_url}
                    muted
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={post.image_url || post.media_url}
                    alt={post.caption || "Publicación"}
                    className="w-full h-full object-cover zoom-hover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 overlay-gradient">
                  <div className="flex items-center gap-6 text-white font-bold drop-shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="flex items-center gap-2 text-lg">
                      <Heart size={22} fill="currentColor" className="drop-shadow" /> {post.likes_count || 0}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card p-10 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Grid3X3 size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Aún no hay publicaciones</h3>
            <p className="text-sm text-muted-foreground">Comparte tu primera foto o video.</p>
            {isOwnProfile && (
              <a
                href="/create"
                className="inline-flex items-center justify-center px-6 py-2 bg-foreground text-background rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Crear publicación
              </a>
            )}
          </div>
        )}

        <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
          <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
            {selectedPost && (
              <div className="grid md:grid-cols-2">
                <div className="bg-black">
                  {selectedPost.media_type === "video" ? (
                    <video
                      src={selectedPost.image_url || selectedPost.media_url}
                      controls
                      className="w-full h-full object-contain max-h-[70vh] bg-black"
                    />
                  ) : selectedPost.media_type === "audio" ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/30 to-background p-6">
                      <audio controls src={selectedPost.image_url || selectedPost.media_url} className="w-full" />
                    </div>
                  ) : (
                    <img
                      src={selectedPost.image_url || selectedPost.media_url}
                      alt={selectedPost.caption || "Publicación"}
                      className="w-full h-full object-contain max-h-[70vh] bg-black"
                    />
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold">{parseCaption(selectedPost.caption || "Sin descripción")}</h3>
                  <p className="text-sm text-muted-foreground">
                    Likes: {selectedPost.likes_count || 0}
                  </p>
                  <Button onClick={() => setSelectedPost(null)} className="w-full">
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Editar perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold">Imagen de portada</label>
                <div className="space-y-3">
                  {profileData.coverImageUrl && (
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-muted shadow-md transition-all duration-300 hover:shadow-lg">
                      <img
                        src={profileData.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                  {!profileData.coverImageUrl && (
                    <div className="w-full h-32 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Sin imagen de portada</p>
                    </div>
                  )}
                  <label className="px-6 py-2 bg-foreground text-background rounded-lg cursor-pointer font-semibold text-sm hover:scale-105 hover:shadow-lg transition-all duration-300 inline-block">
                    {profileData.coverImageUrl ? "Cambiar portada" : "Agregar portada"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Foto de perfil</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profileData.profilePictureUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-accent shadow-md transition-all duration-300 hover:scale-105 hover:ring-primary"
                    />
                  </div>
                  <label className="px-6 py-2 bg-foreground text-background rounded-lg cursor-pointer font-semibold text-sm hover:scale-105 hover:shadow-lg transition-all duration-300">
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Nombre de usuario</label>
                <Input
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  disabled={profileData.usernameChanged}
                />
                {profileData.usernameChanged && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    ⚠️ Ya has cambiado tu nombre de usuario una vez. No puedes cambiarlo nuevamente.
                  </p>
                )}
                {!profileData.usernameChanged && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Solo puedes cambiar tu nombre de usuario una vez.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Nombre completo</label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Ubicación</label>
                <Input
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  placeholder="Tu ubicación"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Sitio web</label>
                <Input
                  value={profileData.website}
                  onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                  placeholder="https://tusitio.com"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Enlaces (estilo TikTok)</label>
                  <span className="text-xs text-muted-foreground">
                    {socialLinks.length}/5 {loadingLinks ? "· cargando..." : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {socialLinks.map((link, index) => (
                    <div
                      key={`${link.id || "nuevo"}-${index}`}
                      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg bg-accent/40 border border-border/60"
                    >
                      <Input
                        value={link.platform}
                        onChange={(e) => handleLinkChange(index, "platform", e.target.value)}
                        placeholder="Plataforma (TikTok, Instagram, YouTube)"
                        className="sm:w-40"
                      />
                      <div className="flex w-full sm:flex-1 gap-2 items-center">
                        <Input
                          value={link.url}
                          onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                          placeholder="https://tu-link.com"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(index)}
                          className="p-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors"
                          aria-label="Eliminar enlace"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!socialLinks.length && (
                    <p className="text-sm text-muted-foreground">
                      Añade enlaces a tus otras redes y destácalos en tu perfil.
                    </p>
                  )}

                  {socialLinks.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddLink}
                      className="w-full justify-center"
                      disabled={isSaving}
                    >
                      <Plus size={16} className="mr-2" />
                      Añadir enlace
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Biografía</label>
                <Textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="resize-none"
                  rows={4}
                  placeholder="Cuéntanos sobre ti"
                />
              </div>

              {saveMessage && (
                <div className={cn(
                  "p-4 rounded-lg text-sm font-medium",
                  saveMessage.type === 'success' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                )}>
                  {saveMessage.text}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSaveProfile} 
                  className="flex-1" 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </Button>
                <Button 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSaveMessage(null);
                  }} 
                  variant="outline" 
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {showProfileStoryViewer && profileStoryUser && (
          <StoryViewer
            stories={[profileStoryUser]}
            initialUserIndex={0}
            onClose={() => setShowProfileStoryViewer(false)}
            onUserStoriesSeen={(userId) => {
              markStoriesSeen(userId);
              setShowProfileStoryViewer(false);
            }}
          />
        )}

        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={profileData.id}
          type="followers"
        />

        <FollowersModal
          isOpen={isFollowingModalOpen}
          onClose={() => setIsFollowingModalOpen(false)}
          userId={profileData.id}
          type="following"
        />
      </div>
    </MainLayout>
  );
};

export default Profile;
