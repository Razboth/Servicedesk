"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var socket_io_1 = require("socket.io");
var io = null;
// Initialize Socket.io server
function initializeSocketServer(server) {
    var _this = this;
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
    io.on('connection', function (socket) {
        console.log("\uD83D\uDD0C Client connected: ".concat(socket.id));
        // Handle authentication and join appropriate rooms
        socket.on('authenticate', function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!data.userId) {
                    socket.emit('auth_error', { message: 'Authentication required' });
                    return [2 /*return*/];
                }
                // Join user-specific room
                socket.join("user:".concat(data.userId));
                // Join role-based room
                if (data.role) {
                    socket.join("role:".concat(data.role));
                }
                // Join branch-specific room
                if (data.branchId) {
                    socket.join("branch:".concat(data.branchId));
                }
                // Special rooms for technicians and admins
                if (['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST'].includes(data.role)) {
                    socket.join('technicians');
                }
                socket.emit('authenticated', {
                    userId: data.userId,
                    rooms: Array.from(socket.rooms)
                });
                console.log("\u2705 User ".concat(data.userId, " authenticated with role ").concat(data.role));
                return [2 /*return*/];
            });
        }); });
        // Handle disconnection
        socket.on('disconnect', function () {
            console.log("\uD83D\uDD0C Client disconnected: ".concat(socket.id));
        });
        // Handle subscription to specific ticket
        socket.on('subscribe:ticket', function (ticketId) {
            socket.join("ticket:".concat(ticketId));
            console.log("Client ".concat(socket.id, " subscribed to ticket ").concat(ticketId));
        });
        // Handle unsubscription from ticket
        socket.on('unsubscribe:ticket', function (ticketId) {
            socket.leave("ticket:".concat(ticketId));
            console.log("Client ".concat(socket.id, " unsubscribed from ticket ").concat(ticketId));
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
    io.to('technicians').emit('ticket:created', __assign(__assign({}, ticket), { timestamp: new Date() }));
    // Emit to branch-specific room if branch is specified
    if (ticket.branchId) {
        io.to("branch:".concat(ticket.branchId)).emit('ticket:created', __assign(__assign({}, ticket), { timestamp: new Date() }));
    }
    // Emit to the creator
    io.to("user:".concat(ticket.createdBy)).emit('ticket:created', __assign(__assign({}, ticket), { timestamp: new Date() }));
    console.log("\uD83D\uDCE2 Emitted ticket:created for ticket ".concat(ticket.ticketNumber));
}
// Emit ticket updated event
function emitTicketUpdated(ticketId, changes, updatedBy) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    var update = {
        id: ticketId,
        changes: changes,
        updatedBy: updatedBy,
        timestamp: new Date()
    };
    // Emit to all users subscribed to this ticket
    io.to("ticket:".concat(ticketId)).emit('ticket:updated', update);
    // Emit to technicians if status or assignment changed
    if (changes.status || changes.assignedToId) {
        io.to('technicians').emit('ticket:updated', update);
    }
    console.log("\uD83D\uDCE2 Emitted ticket:updated for ticket ".concat(ticketId));
}
// Emit ticket assigned event
function emitTicketAssigned(ticketId, assignedToId, assignedBy) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    var assignmentData = {
        ticketId: ticketId,
        assignedToId: assignedToId,
        assignedBy: assignedBy,
        timestamp: new Date()
    };
    // Notify the assigned user
    io.to("user:".concat(assignedToId)).emit('ticket:assigned', assignmentData);
    // Notify all subscribed to the ticket
    io.to("ticket:".concat(ticketId)).emit('ticket:assigned', assignmentData);
    // Notify technicians room
    io.to('technicians').emit('ticket:assigned', assignmentData);
    console.log("\uD83D\uDCE2 Emitted ticket:assigned for ticket ".concat(ticketId, " to user ").concat(assignedToId));
}
// Emit ticket comment added event
function emitTicketCommented(ticketId, commentData) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    // Emit to all users subscribed to this ticket
    io.to("ticket:".concat(ticketId)).emit('ticket:commented', __assign(__assign({ ticketId: ticketId }, commentData), { timestamp: new Date() }));
    console.log("\uD83D\uDCE2 Emitted ticket:commented for ticket ".concat(ticketId));
}
// Emit ticket status changed event
function emitTicketStatusChanged(ticketId, oldStatus, newStatus, changedBy) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    var statusData = {
        ticketId: ticketId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedBy: changedBy,
        timestamp: new Date()
    };
    // Emit to ticket subscribers
    io.to("ticket:".concat(ticketId)).emit('ticket:status_changed', statusData);
    // Emit to technicians
    io.to('technicians').emit('ticket:status_changed', statusData);
    console.log("\uD83D\uDCE2 Emitted ticket:status_changed for ticket ".concat(ticketId, ": ").concat(oldStatus, " \u2192 ").concat(newStatus));
}
// Emit batch update for multiple tickets
function emitBatchTicketUpdate(ticketIds, changes, updatedBy) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    var batchData = {
        ticketIds: ticketIds,
        changes: changes,
        updatedBy: updatedBy,
        timestamp: new Date()
    };
    // Emit to technicians
    io.to('technicians').emit('tickets:batch_updated', batchData);
    // Emit to each ticket's room
    ticketIds.forEach(function (ticketId) {
        io.to("ticket:".concat(ticketId)).emit('ticket:updated', {
            id: ticketId,
            changes: changes,
            updatedBy: updatedBy,
            timestamp: new Date()
        });
    });
    console.log("\uD83D\uDCE2 Emitted batch update for ".concat(ticketIds.length, " tickets"));
}
// Utility function to broadcast to specific rooms
function broadcastToRooms(rooms, event, data) {
    if (!io) {
        console.warn('Socket.io not initialized');
        return;
    }
    rooms.forEach(function (room) {
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
