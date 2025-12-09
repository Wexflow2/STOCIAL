import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: WebSocket | null;
    isConnected: boolean;
    onlineUsers: Set<number>;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    onlineUsers: new Set(),
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { dbUser } = useAuth();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Determine WebSocket URL based on API URL
        const apiUrl = import.meta.env.VITE_API_URL || 'https://stocial.eliverdiaz72.workers.dev';
        const wsUrl = apiUrl.replace('http', 'ws').replace('https', 'wss') + '/socket';

        console.log('Connecting to WebSocket:', wsUrl);

        const newSocket = new WebSocket(wsUrl);

        newSocket.onopen = () => {
            console.log('Connected to socket server');
            setIsConnected(true);

            // Notify server that user is online
            if (dbUser?.id) {
                newSocket.send(JSON.stringify({ type: 'user_online', userId: dbUser.id }));
            }
        };

        newSocket.onclose = () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
        };

        newSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'user_status_change') {
                    const { userId, isOnline } = data;
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev);
                        if (isOnline) {
                            newSet.add(userId);
                        } else {
                            newSet.delete(userId);
                        }
                        return newSet;
                    });
                } else if (data.type === 'online_users') {
                    setOnlineUsers(new Set(data.users));
                }
            } catch (error) {
                console.error('Error parsing websocket message:', error);
            }
        };

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [dbUser?.id]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
