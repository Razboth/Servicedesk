'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useSocket() {
  const { data: session } = useSession();
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isConnecting: false,
    error: null
  });
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!session?.user?.id || socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Connect to the Socket.io server on port 3002
      // In development, Socket.io runs on a separate port from Next.js
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin  // Use same origin in production
        : 'http://localhost:3002'; // Use port 3002 in development where Socket.io server runs
      
      console.log('🔗 Connecting to Socket.io server at:', socketUrl);
      
      const socket = io(socketUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        auth: {
          userId: session.user.id,
          role: session.user.role
        }
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('🔌 Socket connected');
        setState({ isConnected: true, isConnecting: false, error: null });
        reconnectAttemptsRef.current = 0;
        
        // Authenticate with server
        socket.emit('authenticate', {
          userId: session.user.id,
          role: session.user.role,
          branchId: (session.user as any).branchId
        });
      });

      socket.on('authenticated', (data) => {
        console.log('✅ Socket authenticated:', data);
      });

      socket.on('auth_error', (error) => {
        console.error('❌ Socket auth error:', error);
        setState(prev => ({ ...prev, error: error.message }));
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setState({ isConnected: false, isConnecting: false, error: null });
        
        // Handle reconnection for abnormal disconnections
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          handleReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setState({ 
          isConnected: false, 
          isConnecting: false, 
          error: `Connection failed: ${error.message}` 
        });
        handleReconnect();
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setState({ 
        isConnected: false, 
        isConnecting: false, 
        error: 'Failed to initialize socket connection' 
      });
    }
  }, [session]);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setState(prev => ({ 
        ...prev, 
        error: 'Maximum reconnection attempts reached. Please refresh the page.' 
      }));
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    
    console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      error: null
    });
  }, []);

  // Subscribe to events
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
    
    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  // Emit events
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit '${event}': Socket not connected`);
    }
  }, []);

  // Subscribe to specific ticket
  const subscribeToTicket = useCallback((ticketId: string) => {
    emit('subscribe:ticket', ticketId);
  }, [emit]);

  // Unsubscribe from specific ticket
  const unsubscribeFromTicket = useCallback((ticketId: string) => {
    emit('unsubscribe:ticket', ticketId);
  }, [emit]);

  // Initialize connection when session is available
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    on,
    emit,
    subscribeToTicket,
    unsubscribeFromTicket,
    socket: socketRef.current
  };
}

// Hook for ticket list real-time updates
export function useTicketListUpdates(onUpdate: () => void) {
  const { on, isConnected } = useSocket();
  const { data: session } = useSession();

  useEffect(() => {
    if (!isConnected || !session?.user) return;

    // Listen for ticket events based on user role
    const handlers: Array<() => void> = [];

    // All users listen to ticket created/updated events
    const handleTicketCreated = (data: any) => {
      console.log('📢 Ticket created:', data);
      onUpdate();
    };

    const handleTicketUpdated = (data: any) => {
      console.log('📢 Ticket updated:', data);
      onUpdate();
    };

    const handleTicketStatusChanged = (data: any) => {
      console.log('📢 Ticket status changed:', data);
      onUpdate();
    };

    const handleTicketAssigned = (data: any) => {
      console.log('📢 Ticket assigned:', data);
      onUpdate();
    };

    const handleBatchUpdate = (data: any) => {
      console.log('📢 Batch ticket update:', data);
      onUpdate();
    };

    // Subscribe to events
    handlers.push(
      on('ticket:created', handleTicketCreated),
      on('ticket:updated', handleTicketUpdated),
      on('ticket:status_changed', handleTicketStatusChanged),
      on('ticket:assigned', handleTicketAssigned),
      on('tickets:batch_updated', handleBatchUpdate)
    );

    // Cleanup
    return () => {
      handlers.forEach(cleanup => cleanup());
    };
  }, [isConnected, session, on, onUpdate]);
}

// Hook for single ticket real-time updates
export function useTicketUpdates(ticketId: string | null, onUpdate: () => void) {
  const { on, subscribeToTicket, unsubscribeFromTicket, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected || !ticketId) return;

    // Subscribe to specific ticket
    subscribeToTicket(ticketId);

    // Listen for ticket-specific events
    const handlers: Array<() => void> = [];

    const handleUpdate = (data: any) => {
      console.log(`📢 Ticket ${ticketId} updated:`, data);
      onUpdate();
    };

    const handleComment = (data: any) => {
      console.log(`📢 Ticket ${ticketId} commented:`, data);
      onUpdate();
    };

    const handleStatusChange = (data: any) => {
      console.log(`📢 Ticket ${ticketId} status changed:`, data);
      onUpdate();
    };

    const handleAssignment = (data: any) => {
      console.log(`📢 Ticket ${ticketId} assigned:`, data);
      onUpdate();
    };

    // Subscribe to events
    handlers.push(
      on('ticket:updated', handleUpdate),
      on('ticket:commented', handleComment),
      on('ticket:status_changed', handleStatusChange),
      on('ticket:assigned', handleAssignment)
    );

    // Cleanup
    return () => {
      unsubscribeFromTicket(ticketId);
      handlers.forEach(cleanup => cleanup());
    };
  }, [isConnected, ticketId, on, subscribeToTicket, unsubscribeFromTicket, onUpdate]);
}