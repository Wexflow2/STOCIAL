import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
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
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '').replace('http://', 'https://') || 'http://localhost:5000';
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            upgrade: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
            
            // Notify server that user is online
            if (dbUser?.id) {
                newSocket.emit('user_online', dbUser.id);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
        });

        // Listen for user status changes
        newSocket.on('user_status_change', ({ userId, isOnline }: { userId: number; isOnline: boolean }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (isOnline) {
                    newSet.add(userId);
                } else {
                    newSet.delete(userId);
                }
                return newSet;
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [dbUser?.id]);

    // Fetch initial online users
    useEffect(() => {
        if (isConnected) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            fetch(`${apiUrl}/api/users/online`)
                .then(res => res.json())
                .then(data => {
                    setOnlineUsers(new Set(data.onlineUsers));
                })
                .catch(err => console.error('Error fetching online users:', err));
        }
    }, [isConnected]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
