import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  data
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data
      }
    });

    // TODO: Emit socket event for real-time notification
    // if (global.io) {
    //   global.io.to(`user:${userId}`).emit('notification', notification);
    // }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function createTicketNotifications(
  ticketId: string,
  type: NotificationType,
  excludeUserId?: string
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        assignedTo: true,
        service: {
          include: {
            category: true
          }
        }
      }
    });

    if (!ticket) return;

    const notifications = [];
    
    // Determine who should be notified based on notification type
    const usersToNotify = new Set<string>();

    switch (type) {
      case 'TICKET_ASSIGNED':
        // Notify the assigned technician
        if (ticket.assignedToId && ticket.assignedToId !== excludeUserId) {
          usersToNotify.add(ticket.assignedToId);
        }
        break;

      case 'TICKET_UPDATED':
      case 'TICKET_RESOLVED':
      case 'TICKET_CLOSED':
        // Notify the ticket creator
        if (ticket.createdById !== excludeUserId) {
          usersToNotify.add(ticket.createdById);
        }
        // Also notify assigned technician if different
        if (ticket.assignedToId && ticket.assignedToId !== excludeUserId) {
          usersToNotify.add(ticket.assignedToId);
        }
        break;

      case 'TICKET_COMMENT':
        // Notify both creator and assignee, except the commenter
        if (ticket.createdById !== excludeUserId) {
          usersToNotify.add(ticket.createdById);
        }
        if (ticket.assignedToId && ticket.assignedToId !== excludeUserId) {
          usersToNotify.add(ticket.assignedToId);
        }
        break;

      case 'TICKET_APPROVED':
      case 'TICKET_REJECTED':
        // Notify the ticket creator and assigned technician
        if (ticket.createdById !== excludeUserId) {
          usersToNotify.add(ticket.createdById);
        }
        if (ticket.assignedToId && ticket.assignedToId !== excludeUserId) {
          usersToNotify.add(ticket.assignedToId);
        }
        break;
    }

    // Create notifications for each user
    for (const userId of usersToNotify) {
      const title = getNotificationTitle(type, ticket.ticketNumber);
      const message = getNotificationMessage(type, ticket);
      
      const notification = await createNotification({
        userId,
        type,
        title,
        message,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title
        }
      });
      
      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error('Error creating ticket notifications:', error);
    throw error;
  }
}

function getNotificationTitle(type: NotificationType, ticketNumber: string): string {
  switch (type) {
    case 'TICKET_CREATED':
      return `New Ticket #${ticketNumber}`;
    case 'TICKET_ASSIGNED':
      return `Ticket #${ticketNumber} Assigned to You`;
    case 'TICKET_UPDATED':
      return `Ticket #${ticketNumber} Updated`;
    case 'TICKET_RESOLVED':
      return `Ticket #${ticketNumber} Resolved`;
    case 'TICKET_CLOSED':
      return `Ticket #${ticketNumber} Closed`;
    case 'TICKET_COMMENT':
      return `New Comment on Ticket #${ticketNumber}`;
    case 'TICKET_APPROVED':
      return `Ticket #${ticketNumber} Approved`;
    case 'TICKET_REJECTED':
      return `Ticket #${ticketNumber} Rejected`;
    case 'TICKET_ESCALATED':
      return `Ticket #${ticketNumber} Escalated`;
    default:
      return `Ticket #${ticketNumber} Update`;
  }
}

function getNotificationMessage(type: NotificationType, ticket: any): string {
  const serviceName = ticket.service?.name || 'Service Request';
  const categoryName = ticket.service?.category?.name || 'General';
  
  switch (type) {
    case 'TICKET_CREATED':
      return `A new ${serviceName} ticket has been created in ${categoryName}.`;
    case 'TICKET_ASSIGNED':
      return `You have been assigned to work on: ${ticket.title}`;
    case 'TICKET_UPDATED':
      return `Status or details have been updated for: ${ticket.title}`;
    case 'TICKET_RESOLVED':
      return `Your ticket "${ticket.title}" has been resolved.`;
    case 'TICKET_CLOSED':
      return `Your ticket "${ticket.title}" has been closed.`;
    case 'TICKET_COMMENT':
      return `A new comment has been added to: ${ticket.title}`;
    case 'TICKET_APPROVED':
      return `Your ticket "${ticket.title}" has been approved and is now being processed.`;
    case 'TICKET_REJECTED':
      return `Your ticket "${ticket.title}" has been rejected. Please check the reason provided.`;
    case 'TICKET_ESCALATED':
      return `Ticket "${ticket.title}" has been escalated to higher priority.`;
    default:
      return `There's an update on your ticket: ${ticket.title}`;
  }
}