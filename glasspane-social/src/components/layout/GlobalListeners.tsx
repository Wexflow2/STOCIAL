import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const GlobalListeners = () => {
    const { dbUser } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket || !dbUser?.id) return;

        // Listen for new messages
        socket.on(`new_message_${dbUser.id}`, (message: any) => {
            // Don't show toast if we are already on the messages page and chatting with this user
            // But since we don't know the active chat here easily without complex state, 
            // we'll just show it unless we are on /messages (simplification)
            // A better way is to rely on the UI to handle it if visible, but a toast is always safe.

            const isMessageRequest = message.status === 'pending'; // We need to ensure backend sends status

            toast(isMessageRequest ? "Nueva solicitud de mensaje" : `Nuevo mensaje de @${message.username || 'usuario'}`, {
                description: message.type === 'text' ? message.content : (message.type === 'image' ? 'Envió una imagen' : 'Envió un audio'),
                action: {
                    label: "Ver",
                    onClick: () => navigate("/messages")
                },
            });
        });

        // Listen for notifications
        socket.on(`notification_${dbUser.id}`, (notification: any) => {
            // Don't show toast for follow requests - they should only appear in Notifications page
            if (notification.type === 'follow_request') {
                return;
            }

            let title = "Nueva notificación";
            let description = "";

            switch (notification.type) {
                case 'like':
                    title = "Nuevo Me gusta";
                    description = `@${notification.sender_username} le gustó tu publicación`;
                    break;
                case 'comment':
                    title = "Nuevo comentario";
                    description = `@${notification.sender_username} comentó tu publicación`;
                    break;
                case 'follow':
                    title = "Nuevo seguidor";
                    description = `@${notification.sender_username} comenzó a seguirte`;
                    break;
                case 'follow_accepted':
                    title = "Solicitud aceptada";
                    description = `@${notification.sender_username} aceptó tu solicitud`;
                    break;
            }

            toast(title, {
                description,
                action: {
                    label: "Ver",
                    onClick: () => navigate(notification.type === 'follow' || notification.type === 'follow_accepted' ? `/profile?username=${notification.sender_username}` : "/notifications")
                },
            });
        });

        return () => {
            socket.off(`new_message_${dbUser.id}`);
            socket.off(`notification_${dbUser.id}`);
        };
    }, [socket, dbUser, navigate]);

    return null; // This component doesn't render anything
};
