import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';

let io: SocketIOServer | null = null;

interface TicketUpdate {
  id: string;
  changes: Record<string, any>;
  updatedBy?: string;
  timestamp?: Date;
}

interface TicketCreated {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  branchId?: string;
  createdBy: string;
  timestamp?: Date;
}

// Initialize Socket.io server
export function initializeSocketServer(server: HTTPServer | HTTPSServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL || 'https://localhost:3000'
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'], // Support both transports
  });

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle authentication and join appropriate rooms
    socket.on('authenticate', async (data: { userId: string; role: string; branchId?: string }) => {
      if (!data.userId) {
        socket.emit('auth_error', { message: 'Authentication required' });
        return;
      }

      // Join user-specific room
      socket.join(`user:${data.userId}`);
      
      // Join role-based room
      if (data.role) {
        socket.join(`role:${data.role}`);
      }
      
      // Join branch-specific room
      if (data.branchId) {
        socket.join(`branch:${data.branchId}`);
      }

      // Special rooms for technicians and admins
      if (['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST'].includes(data.role)) {
        socket.join('technicians');
      }

      socket.emit('authenticated', { 
        userId: data.userId, 
        rooms: Array.from(socket.rooms) 
      });
      
      console.log(`✅ User ${data.userId} authenticated with role ${data.role}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });

    // Handle subscription to specific ticket
    socket.on('subscribe:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`Client ${socket.id} subscribed to ticket ${ticketId}`);
    });

    // Handle unsubscription from ticket
    socket.on('unsubscribe:ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`Client ${socket.id} unsubscribed from ticket ${ticketId}`);
    });
  });

  console.log('✅ Socket.io server initialized');
  return io;
}

// Get Socket.io instance
export function getIO(): SocketIOServer | null {
  return io;
}

// Emit ticket created event
export function emitTicketCreated(ticket: TicketCreated) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  // Emit to all technicians and admins
  io.to('technicians').emit('ticket:created', {
    ...ticket,
    timestamp: new Date()
  });

  // Emit to branch-specific room if branch is specified
  if (ticket.branchId) {
    io.to(`branch:${ticket.branchId}`).emit('ticket:created', {
      ...ticket,
      timestamp: new Date()
    });
  }

  // Emit to the creator
  io.to(`user:${ticket.createdBy}`).emit('ticket:created', {
    ...ticket,
    timestamp: new Date()
  });

  console.log(`📢 Emitted ticket:created for ticket ${ticket.ticketNumber}`);
}

// Emit ticket updated event
export function emitTicketUpdated(ticketId: string, changes: Record<string, any>, updatedBy?: string) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const update: TicketUpdate = {
    id: ticketId,
    changes,
    updatedBy,
    timestamp: new Date()
  };

  // Emit to all users subscribed to this ticket
  io.to(`ticket:${ticketId}`).emit('ticket:updated', update);

  // Emit to technicians if status or assignment changed
  if (changes.status || changes.assignedToId) {
    io.to('technicians').emit('ticket:updated', update);
  }

  console.log(`📢 Emitted ticket:updated for ticket ${ticketId}`);
}

// Emit ticket assigned event
export function emitTicketAssigned(ticketId: string, assignedToId: string, assignedBy: string) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const assignmentData = {
    ticketId,
    assignedToId,
    assignedBy,
    timestamp: new Date()
  };

  // Notify the assigned user
  io.to(`user:${assignedToId}`).emit('ticket:assigned', assignmentData);

  // Notify all subscribed to the ticket
  io.to(`ticket:${ticketId}`).emit('ticket:assigned', assignmentData);

  // Notify technicians room
  io.to('technicians').emit('ticket:assigned', assignmentData);

  console.log(`📢 Emitted ticket:assigned for ticket ${ticketId} to user ${assignedToId}`);
}

// Emit ticket comment added event
export function emitTicketCommented(ticketId: string, commentData: any) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  // Emit to all users subscribed to this ticket
  io.to(`ticket:${ticketId}`).emit('ticket:commented', {
    ticketId,
    ...commentData,
    timestamp: new Date()
  });

  console.log(`📢 Emitted ticket:commented for ticket ${ticketId}`);
}

// Emit ticket status changed event
export function emitTicketStatusChanged(ticketId: string, oldStatus: string, newStatus: string, changedBy: string) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const statusData = {
    ticketId,
    oldStatus,
    newStatus,
    changedBy,
    timestamp: new Date()
  };

  // Emit to ticket subscribers
  io.to(`ticket:${ticketId}`).emit('ticket:status_changed', statusData);

  // Emit to technicians
  io.to('technicians').emit('ticket:status_changed', statusData);

  console.log(`📢 Emitted ticket:status_changed for ticket ${ticketId}: ${oldStatus} → ${newStatus}`);
}

// Emit batch update for multiple tickets
export function emitBatchTicketUpdate(ticketIds: string[], changes: Record<string, any>, updatedBy: string) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const batchData = {
    ticketIds,
    changes,
    updatedBy,
    timestamp: new Date()
  };

  // Emit to technicians
  io.to('technicians').emit('tickets:batch_updated', batchData);

  // Emit to each ticket's room
  ticketIds.forEach(ticketId => {
    io!.to(`ticket:${ticketId}`).emit('ticket:updated', {
      id: ticketId,
      changes,
      updatedBy,
      timestamp: new Date()
    });
  });

  console.log(`📢 Emitted batch update for ${ticketIds.length} tickets`);
}

// Utility function to broadcast to specific rooms
export function broadcastToRooms(rooms: string[], event: string, data: any) {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  rooms.forEach(room => {
    io!.to(room).emit(event, data);
  });
}

// Utility function to get connected clients count
export function getConnectedClientsCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

// Utility function to get rooms info
export function getRoomsInfo(): Map<string, Set<string>> | null {
  if (!io) return null;
  return io.sockets.adapter.rooms;
}