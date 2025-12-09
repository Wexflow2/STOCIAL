import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Search as SearchIcon, Loader, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  name: string;
  bio: string;
  avatar: string;
  isFollowing: boolean;
  followStatus: string | null;
  followers: number;
}

export const Search = () => {
  const { dbUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'photography',
    'travel',
    'design',
  ]);

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const url = new URL('https://stocial.eliverdiaz72.workers.dev/api/search-users');
      url.searchParams.append('q', encodeURIComponent(q));
      if (dbUser?.id) {
        url.searchParams.append('currentUserId', dbUser.id.toString());
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      const users = (data.users || []).filter((u: any) => u.id !== dbUser?.id);
      setResults(users);
    } catch (err) {
      console.error('Error searching users:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFollow = async (userId: number) => {
    if (!dbUser?.id || userId === dbUser.id) return;
    try {
      const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: userId, follower_id: dbUser?.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(
          results.map((user) =>
            user.id === userId
              ? { 
                  ...user, 
                  isFollowing: data.status === 'accepted' ? true : user.isFollowing,
                  followStatus: data.status || user.followStatus
                }
              : user
          )
        );
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const addRecentSearch = (q: string) => {
    if (!recentSearches.includes(q)) {
      setRecentSearches([q, ...recentSearches].slice(0, 5));
    }
  };

  const handleSearchSelect = (q: string) => {
    setQuery(q);
    addRecentSearch(q);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Busca usuarios, hashtags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted rounded-2xl border border-transparent focus:border-foreground focus:outline-none transition-colors text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-muted-foreground text-sm">@{user.username}</p>
                    {user.bio && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {user.bio}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.followers} seguidores
                    </p>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={cn(
                      "px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg",
                      user.followStatus === 'pending'
                        ? "bg-muted text-foreground border border-border cursor-not-allowed"
                        : user.isFollowing
                          ? "bg-muted text-foreground border border-border"
                          : "bg-foreground text-background hover:opacity-90"
                    )}
                    disabled={user.followStatus === 'pending'}
                  >
                    {user.followStatus === 'pending' ? "Pendiente" : user.isFollowing ? "Siguiendo" : "Seguir"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !query && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Búsquedas recientes</h2>
            <div className="space-y-2">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleSearchSelect(search)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SearchIcon className="w-4 h-4 text-muted-foreground" />
                    <span>{search}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No encontramos resultados para "{query}"</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
