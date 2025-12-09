import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accepted' | 'mention';
  sender_id: number;
  sender_username: string;
  sender_avatar: string;
  post_id?: number;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { dbUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dbUser?.id) {
      loadNotifications();
    }
  }, [dbUser]);

  useEffect(() => {
    if (!socket || !dbUser?.id) return;

    socket.on(`notification_${dbUser.id}`, (newNotification: Notification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      socket.off(`notification_${dbUser.id}`);
    };
  }, [socket, dbUser]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`https://stocial.eliverdiaz72.workers.dev/api/notifications/${dbUser?.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationText = (type: string) => {
    switch (type) {
      case 'like': return "le gustó tu publicación";
      case 'comment': return "comentó en tu publicación";
      case 'follow': return "comenzó a seguirte";
      case 'follow_request': return "quiere seguirte";
      case 'follow_accepted': return "aceptó tu solicitud de seguimiento";
      case 'mention': return "te mencionó en una publicación";
      default: return "interactuó contigo";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read logic here if needed

    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.sender_username) {
      navigate(`/profile?username=${notification.sender_username}`);
    }
  };

  const handleAcceptFollow = async (e: React.MouseEvent, notificationId: number, senderId: number) => {
    e.stopPropagation();
    try {
      await fetch('https://stocial.eliverdiaz72.workers.dev/api/follow/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: senderId, following_id: dbUser?.id })
      });

      // Remove notification or mark as handled
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error accepting follow:", error);
    }
  };

  const handleRejectFollow = async (e: React.MouseEvent, notificationId: number, senderId: number) => {
    e.stopPropagation();
    try {
      await fetch('https://stocial.eliverdiaz72.workers.dev/api/follow/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: senderId, following_id: dbUser?.id })
      });

      // Remove notification
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error rejecting follow:", error);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "glass-card p-4 flex items-center gap-4 transition-all cursor-pointer hover:bg-accent/5",
                  !notification.read && "bg-accent/10 border-l-4 border-l-primary"
                )}
              >
                <img
                  src={notification.sender_avatar || "https://via.placeholder.com/50"}
                  alt={notification.sender_username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{notification.sender_username}</span>
                    {" "}{getNotificationText(notification.type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>

                  {notification.type === 'follow_request' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => handleAcceptFollow(e, notification.id, notification.sender_id)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={(e) => handleRejectFollow(e, notification.id, notification.sender_id)}
                        className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
                {notification.post_id && (
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {/* Placeholder for post thumbnail - in real app we'd need post image url in notification */}
                    <div className="w-full h-full bg-accent/50 flex items-center justify-center text-[10px] text-muted-foreground">
                      Post
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No tienes notificaciones aún
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
