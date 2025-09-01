"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketServer = initializeSocketServer;
exports.getIO = getIO;
exports.emitTicketCreated = emitTicketCreated;
exports.emitTicketUpdated = emitTicketUpdated;
exports.emitTicketAssigned = emitTicketAssigned;
exports.emitTicketCommented = emitTicketCommented;
exports.emitTicketStatusChanged = emitTicketStatusChanged;
exports.emitBatchTicketUpdate = emitBatchTicketUpdate;
exports.broadcastToRooms = broadcastToRooms;
exports.getConnectedClientsCount = getConnectedClientsCount;
exports.getRoomsInfo = getRoomsInfo;
const socket_io_1 = require("socket.io");
let io = null;
// Initialize Socket.io server
function initializeSocketServer(server) {
    io = new socket_io_1.Server(server, {
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
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // Handle authentication and join appropriate rooms
        socket.on('authenticate', async (data) => {
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
        socket.on('subscribe:ticket', (ticketId) => {
            socket.join(`ticket:${ticketId}`);
            console.log(`Client ${socket.id} subscribed to ticket ${ticketId}`);
        });
        // Handle unsubscription from ticket
        socket.on('unsubscribe:ticket', (ticketId) => {
            socket.leave(`ticket:${ticketId}`);
            console.log(`Client ${socket.id} unsubscribed from ticket ${ticketId}`);
        });
    });
    console.log('✅ Socket.io server initialized');
    return io;
}
// Get Socket.io instance
function getIO() {
    return io;
}
// Emit ticket created event
function emitTicketCreated(ticket) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    // Emit to all technicians and admins
    io.to('technicians').emit('ticket:created', Object.assign(Object.assign({}, ticket), { timestamp: new Date() }));
    // Emit to branch-specific room if branch is specified
    if (ticket.branchId) {
        io.to(`branch:${ticket.branchId}`).emit('ticket:created', Object.assign(Object.assign({}, ticket), { timestamp: new Date() }));
    }
    // Emit to the creator
    io.to(`user:${ticket.createdBy}`).emit('ticket:created', Object.assign(Object.assign({}, ticket), { timestamp: new Date() }));
    console.log(`📢 Emitted ticket:created for ticket ${ticket.ticketNumber}`);
}
// Emit ticket updated event
function emitTicketUpdated(ticketId, changes, updatedBy) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    const update = {
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
function emitTicketAssigned(ticketId, assignedToId, assignedBy) {
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
function emitTicketCommented(ticketId, commentData) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    // Emit to all users subscribed to this ticket
    io.to(`ticket:${ticketId}`).emit('ticket:commented', Object.assign(Object.assign({ ticketId }, commentData), { timestamp: new Date() }));
    console.log(`📢 Emitted ticket:commented for ticket ${ticketId}`);
}
// Emit ticket status changed event
function emitTicketStatusChanged(ticketId, oldStatus, newStatus, changedBy) {
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
function emitBatchTicketUpdate(ticketIds, changes, updatedBy) {
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
        io.to(`ticket:${ticketId}`).emit('ticket:updated', {
            id: ticketId,
            changes,
            updatedBy,
            timestamp: new Date()
        });
    });
    console.log(`📢 Emitted batch update for ${ticketIds.length} tickets`);
}
// Utility function to broadcast to specific rooms
function broadcastToRooms(rooms, event, data) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    rooms.forEach(room => {
        io.to(room).emit(event, data);
    });
}
// Utility function to get connected clients count
function getConnectedClientsCount() {
    if (!io)
        return 0;
    return io.sockets.sockets.size;
}
// Utility function to get rooms info
function getRoomsInfo() {
    if (!io)
        return null;
    return io.sockets.adapter.rooms;
}
