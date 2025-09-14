'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type SocketEventType =
  | 'ticket:created'
  | 'ticket:updated'
  | 'ticket:assigned'
  | 'ticket:resolved'
  | 'ticket:closed'
  | 'ticket:comment'
  | 'notification:new'
  | 'user:status'
  | 'typing:start'
  | 'typing:stop';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Map<string, { ticketId: string; userName: string }>;
  joinTicketRoom: (ticketId: string) => void;
  leaveTicketRoom: (ticketId: string) => void;
  startTyping: (ticketId: string) => void;
  stopTyping: (ticketId: string) => void;
  refreshTickets: () => void;
  refreshNotifications: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: new Map(),
  joinTicketRoom: () => {},
  leaveTicketRoom: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  refreshTickets: () => {},
  refreshNotifications: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, { ticketId: string; userName: string }>>(new Map());

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Initialize socket connection
      const socketInstance = io({
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      // Connection events
      socketInstance.on('connect', () => {
        console.log('🔌 Connected to socket server');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Disconnected from socket server');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // User status events
      socketInstance.on('user:status', (data: { userId: string; status: 'online' | 'offline' }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          if (data.status === 'online') {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      });

      // Ticket events
      socketInstance.on('ticket:created', (data) => {
        // Show toast notification for new tickets
        if (data.ticket.createdById !== session.user.id) {
          toast.success(`New Ticket #${data.ticket.ticketNumber}: ${data.ticket.title}`);
        }
        // Trigger a refresh of the tickets list
        router.refresh();
      });

      socketInstance.on('ticket:updated', (data) => {
        // Show toast for ticket updates
        toast.info(`Ticket #${data.ticket.ticketNumber} status: ${data.ticket.status}`);
        // Trigger a refresh
        router.refresh();
      });

      socketInstance.on('ticket:assigned', (data) => {
        // Show toast for assignment
        if (data.assignedTo.id === session.user.id) {
          toast.success(`Ticket #${data.ticket.ticketNumber} assigned to you: ${data.ticket.title}`);
        }
        router.refresh();
      });

      socketInstance.on('ticket:resolved', (data) => {
        toast.success(`Ticket #${data.ticket.ticketNumber} has been resolved`);
        router.refresh();
      });

      socketInstance.on('ticket:closed', (data) => {
        toast.info(`Ticket #${data.ticket.ticketNumber} has been closed`);
        router.refresh();
      });

      socketInstance.on('ticket:comment', (data) => {
        // Show toast for new comments
        toast.info(`New comment on ticket #${data.ticketId}`);
        router.refresh();
      });

      // Notification events
      socketInstance.on('notification:new', (data) => {
        toast.success(data.notification.title, {
          description: data.notification.message,
        });
        router.refresh();
      });

      // Typing indicators
      socketInstance.on('typing:start', (data: { userId: string; userName: string; ticketId: string }) => {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          updated.set(data.userId, { ticketId: data.ticketId, userName: data.userName });
          return updated;
        });
      });

      socketInstance.on('typing:stop', (data: { userId: string; ticketId: string }) => {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          updated.delete(data.userId);
          return updated;
        });
      });

      // Refresh events
      socketInstance.on('tickets:refresh', () => {
        router.refresh();
      });

      socketInstance.on('notifications:update', (notifications) => {
        // Handle notifications update
        console.log('Notifications updated:', notifications);
        router.refresh();
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [session, status, router]);

  // Socket methods
  const joinTicketRoom = useCallback((ticketId: string) => {
    if (socket && isConnected) {
      socket.emit('ticket:join', ticketId);
    }
  }, [socket, isConnected]);

  const leaveTicketRoom = useCallback((ticketId: string) => {
    if (socket && isConnected) {
      socket.emit('ticket:leave', ticketId);
    }
  }, [socket, isConnected]);

  const startTyping = useCallback((ticketId: string) => {
    if (socket && isConnected) {
      socket.emit('typing:start', { ticketId });
    }
  }, [socket, isConnected]);

  const stopTyping = useCallback((ticketId: string) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { ticketId });
    }
  }, [socket, isConnected]);

  const refreshTickets = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('refresh:tickets');
    }
  }, [socket, isConnected]);

  const refreshNotifications = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('refresh:notifications');
    }
  }, [socket, isConnected]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    joinTicketRoom,
    leaveTicketRoom,
    startTyping,
    stopTyping,
    refreshTickets,
    refreshNotifications,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}