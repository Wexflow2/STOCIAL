import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  type: "followers" | "following";
}

interface UserItem {
  id: number;
  username: string;
  name: string;
  profile_picture_url?: string;
  avatar_url?: string;
}

export function FollowersModal({ isOpen, onClose, userId, type }: FollowersModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && userId) {
      loadUsers();
    }
  }, [isOpen, userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = type === "followers" 
        ? `http://localhost:5000/api/users/${userId}/followers`
        : `http://localhost:5000/api/users/${userId}/following`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    navigate(`/profile?username=${username}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {type === "followers" ? "Seguidores" : "Siguiendo"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.username)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <img
                    src={user.profile_picture_url || user.avatar_url || "https://via.placeholder.com/40"}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay {type === "followers" ? "seguidores" : "siguiendo"} aún</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
