import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { parse } from 'cookie';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

let io: SocketServer | null = null;

// Socket event types
export type SocketEventType =
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

// Room types for organizing connections
export type RoomType =
  | `user:${string}` // Individual user room
  | `branch:${string}` // Branch-specific room
  | `support:${string}` // Support group room
  | `ticket:${string}` // Ticket-specific room
  | 'admins' // All admin users
  | 'managers'; // All managers

// User socket mapping
const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUsers = new Map<string, string>(); // socketId -> userId

// Initialize Socket.io server
export function initSocketServer(httpServer: HTTPServer) {
  if (io) {
    console.log('Socket.io server already initialized');
    return io;
  }

  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get session from cookies
      const cookies = parse(socket.handshake.headers.cookie || '');
      const sessionToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];

      if (!sessionToken) {
        return next(new Error('Authentication required'));
      }

      // Verify session
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session || session.expires < new Date()) {
        return next(new Error('Invalid or expired session'));
      }

      // Attach user to socket
      (socket as any).userId = session.userId;
      (socket as any).user = session.user;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const user = (socket as any).user;

    console.log(`🔌 User connected: ${user.name} (${userId})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketUsers.set(socket.id, userId);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join branch room
    if (user.branchId) {
      socket.join(`branch:${user.branchId}`);
    }

    // Join support group room if applicable
    if (user.supportGroupId) {
      socket.join(`support:${user.supportGroupId}`);
    }

    // Join role-based rooms
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      socket.join('admins');
    }
    if (user.role === 'MANAGER') {
      socket.join('managers');
    }

    // Broadcast user online status
    broadcastUserStatus(userId, 'online');

    // Socket event handlers
    setupSocketEventHandlers(socket, userId, user);

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.name} (${userId})`);

      // Remove socket from tracking
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          // User has no more connections, broadcast offline status
          broadcastUserStatus(userId, 'offline');
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  console.log('✅ Socket.io server initialized');
  return io;
}

// Setup socket event handlers
function setupSocketEventHandlers(socket: Socket, userId: string, user: any) {
  // Join ticket room
  socket.on('ticket:join', async (ticketId: string) => {
    // Verify user has access to this ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        OR: [
          { requesterId: userId },
          { assignedToId: userId },
          { service: { supportGroup: { users: { some: { id: userId } } } } },
        ],
      },
    });

    if (ticket) {
      socket.join(`ticket:${ticketId}`);
      console.log(`User ${user.name} joined ticket room: ${ticketId}`);
    }
  });

  // Leave ticket room
  socket.on('ticket:leave', (ticketId: string) => {
    socket.leave(`ticket:${ticketId}`);
    console.log(`User ${user.name} left ticket room: ${ticketId}`);
  });

  // Typing indicators
  socket.on('typing:start', (data: { ticketId: string }) => {
    socket.to(`ticket:${data.ticketId}`).emit('typing:start', {
      userId,
      userName: user.name,
      ticketId: data.ticketId,
    });
  });

  socket.on('typing:stop', (data: { ticketId: string }) => {
    socket.to(`ticket:${data.ticketId}`).emit('typing:stop', {
      userId,
      userName: user.name,
      ticketId: data.ticketId,
    });
  });

  // Request refresh of specific data
  socket.on('refresh:tickets', async () => {
    // Emit event to refresh tickets list
    socket.emit('tickets:refresh');
  });

  socket.on('refresh:notifications', async () => {
    // Get latest notifications for user
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    socket.emit('notifications:update', notifications);
  });
}

// Broadcast user status
function broadcastUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
  if (!io) return;

  io.emit('user:status', {
    userId,
    status,
    timestamp: new Date(),
  });
}

// Get Socket.io instance
export function getIO(): SocketServer | null {
  return io;
}

// Emit to specific user
export function emitToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Emit to specific branch
export function emitToBranch(branchId: string, event: string, data: any) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit(event, data);
}

// Emit to specific support group
export function emitToSupportGroup(supportGroupId: string, event: string, data: any) {
  if (!io) return;
  io.to(`support:${supportGroupId}`).emit(event, data);
}

// Emit to specific ticket room
export function emitToTicket(ticketId: string, event: string, data: any) {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit(event, data);
}

// Emit to all admins
export function emitToAdmins(event: string, data: any) {
  if (!io) return;
  io.to('admins').emit(event, data);
}

// Emit to all managers
export function emitToManagers(event: string, data: any) {
  if (!io) return;
  io.to('managers').emit(event, data);
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId);
}

// Get online users count
export function getOnlineUsersCount(): number {
  return userSockets.size;
}

// Get online users in a branch
export async function getOnlineUsersInBranch(branchId: string): Promise<string[]> {
  if (!io) return [];

  const sockets = await io.in(`branch:${branchId}`).fetchSockets();
  const userIds = new Set<string>();

  for (const socket of sockets) {
    const userId = socketUsers.get(socket.id);
    if (userId) userIds.add(userId);
  }

  return Array.from(userIds);
}

// Socket event emitters for ticket operations
export async function emitTicketCreated(ticket: any) {
  if (!io) return;

  const event = 'ticket:created';
  const data = {
    ticket,
    timestamp: new Date(),
  };

  // Emit to requester
  emitToUser(ticket.requesterId, event, data);

  // Emit to support group if assigned
  if (ticket.service?.supportGroupId) {
    emitToSupportGroup(ticket.service.supportGroupId, event, data);
  }

  // Emit to branch
  if (ticket.branch?.id) {
    emitToBranch(ticket.branch.id, event, data);
  }

  // Emit to admins
  emitToAdmins(event, data);
}

export async function emitTicketUpdated(ticket: any, previousStatus?: string) {
  if (!io) return;

  const event = 'ticket:updated';
  const data = {
    ticket,
    previousStatus,
    timestamp: new Date(),
  };

  // Emit to ticket room (all participants)
  emitToTicket(ticket.id, event, data);

  // Emit to requester
  emitToUser(ticket.requesterId, event, data);

  // Emit to assigned technician
  if (ticket.assignedToId) {
    emitToUser(ticket.assignedToId, event, data);
  }
}

export async function emitTicketAssigned(ticket: any, assignedTo: any) {
  if (!io) return;

  const event = 'ticket:assigned';
  const data = {
    ticket,
    assignedTo,
    timestamp: new Date(),
  };

  // Emit to ticket room
  emitToTicket(ticket.id, event, data);

  // Emit to newly assigned technician
  emitToUser(assignedTo.id, event, data);

  // Emit to requester
  emitToUser(ticket.requesterId, event, data);
}

export async function emitCommentAdded(ticketId: string, comment: any) {
  if (!io) return;

  const event = 'ticket:comment';
  const data = {
    ticketId,
    comment,
    timestamp: new Date(),
  };

  // Emit to ticket room
  emitToTicket(ticketId, event, data);
}

export async function emitNotification(userId: string, notification: any) {
  if (!io) return;

  const event = 'notification:new';
  const data = {
    notification,
    timestamp: new Date(),
  };

  // Emit to specific user
  emitToUser(userId, event, data);
}

// Clean up on server shutdown
export function closeSocketServer() {
  if (io) {
    io.close();
    io = null;
    userSockets.clear();
    socketUsers.clear();
    console.log('Socket.io server closed');
  }
}