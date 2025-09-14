import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true' || process.env.EMAIL_SERVER_PORT === '465',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Required for some SMTP servers including Outlook
  },
});

// Verify email configuration
export async function verifyEmailConfiguration() {
  try {
    if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      console.warn('⚠️ Email service is not configured. Missing environment variables.');
      return false;
    }

    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    console.log(`   SMTP Host: ${process.env.EMAIL_SERVER_HOST}`);
    console.log(`   SMTP Port: ${process.env.EMAIL_SERVER_PORT || '587'}`);
    console.log(`   From Email: ${process.env.EMAIL_SERVER_USER}`);
    return true;
  } catch (error) {
    console.error('❌ Email server verification failed:', error);
    return false;
  }
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

// Send email function
export async function sendEmail(options: EmailOptions) {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Bank SulutGo ServiceDesk'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SERVER_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email sent
    console.log('📧 Email sent:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email notification types
export type EmailNotificationType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'ticket_approved'
  | 'comment_added'
  | 'technician_action'
  | 'sla_warning'
  | 'sla_breach'
  | 'approval_required'
  | 'approval_completed'
  | 'password_reset'
  | 'account_locked';

// Get email recipients based on notification type
export async function getEmailRecipients(
  ticketId: string,
  notificationType: EmailNotificationType
): Promise<string[]> {
  const recipients: Set<string> = new Set();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true,
      service: {
        include: {
          supportGroup: {
            include: {
              users: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) return [];

  switch (notificationType) {
    case 'ticket_created':
      // Notify requester and support group
      if (ticket.createdBy.email) recipients.add(ticket.createdBy.email);
      if (ticket.service?.supportGroup?.users) {
        ticket.service.supportGroup.users
          .filter(u => u.email)
          .forEach(u => recipients.add(u.email!));
      }
      break;

    case 'ticket_assigned':
      // Notify assigned technician and requester
      if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
      if (ticket.createdBy.email) recipients.add(ticket.createdBy.email);
      break;

    case 'ticket_updated':
    case 'comment_added':
    case 'technician_action':
      // Notify requester and assigned technician
      if (ticket.createdBy.email) recipients.add(ticket.createdBy.email);
      if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
      break;

    case 'ticket_resolved':
    case 'ticket_closed':
      // Notify requester and assigned technician
      if (ticket.createdBy.email) recipients.add(ticket.createdBy.email);
      if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
      break;

    case 'sla_warning':
    case 'sla_breach':
      // Notify assigned technician and managers
      if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
      // Add managers (users with MANAGER role in the same branch)
      const managers = await prisma.user.findMany({
        where: {
          role: 'MANAGER',
          branchId: ticket.createdBy.branchId,
          email: { not: null },
        },
      });
      managers.forEach(m => m.email && recipients.add(m.email));
      break;

    case 'approval_required':
      // Notify approvers
      const approvals = await prisma.ticketApproval.findMany({
        where: {
          ticketId,
          status: 'PENDING',
        },
        include: {
          approver: true,
        },
      });
      approvals
        .filter(a => a.approver.email)
        .forEach(a => recipients.add(a.approver.email!));
      break;

    case 'ticket_approved':
    case 'approval_completed':
      // Notify requester, support group, and assigned technician
      if (ticket.createdBy.email) recipients.add(ticket.createdBy.email);
      if (ticket.assignedTo?.email) recipients.add(ticket.assignedTo.email);
      // Notify all support group members
      if (ticket.service?.supportGroup?.users) {
        ticket.service.supportGroup.users
          .filter(u => u.email)
          .forEach(u => recipients.add(u.email!));
      }
      break;
  }

  return Array.from(recipients);
}

// Send ticket notification
export async function sendTicketNotification(
  ticketId: string,
  notificationType: EmailNotificationType,
  additionalData?: Record<string, any>
) {
  try {
    // Check if email is configured before attempting to send
    if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      console.log('📧 Email service not configured, skipping notification');
      return { success: false, error: 'Email service not configured' };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        assignedTo: true,
        service: true,
        branch: true,
      },
    });

    if (!ticket) {
      console.error('Ticket not found:', ticketId);
      return { success: false, error: 'Ticket not found' };
    }

    const recipients = await getEmailRecipients(ticketId, notificationType);
    if (recipients.length === 0) {
      console.log('No recipients for notification');
      return { success: false, error: 'No recipients' };
    }

    // Get email template based on notification type
    const { subject, html } = await getEmailTemplate(notificationType, {
      ticket,
      ...additionalData,
    });

    // Send email to all recipients
    const result = await sendEmail({
      to: recipients,
      subject,
      html,
    });

    // Log notification
    if (result.success) {
      // Map email notification types to database notification types
      const notificationTypeMap: Record<EmailNotificationType, string> = {
        'ticket_created': 'TICKET_CREATED',
        'ticket_assigned': 'TICKET_ASSIGNED',
        'ticket_updated': 'TICKET_UPDATED',
        'ticket_resolved': 'TICKET_RESOLVED',
        'ticket_closed': 'TICKET_CLOSED',
        'ticket_approved': 'TICKET_APPROVED',
        'comment_added': 'TICKET_COMMENT',
        'technician_action': 'TICKET_UPDATED',
        'sla_warning': 'SYSTEM_ALERT',
        'sla_breach': 'SYSTEM_ALERT',
        'approval_required': 'TICKET_APPROVED',
        'approval_completed': 'TICKET_APPROVED',
        'password_reset': 'SYSTEM_ALERT',
        'account_locked': 'SYSTEM_ALERT',
      };

      await prisma.notification.create({
        data: {
          userId: ticket.createdById,
          type: notificationTypeMap[notificationType] as any || 'SYSTEM_ALERT',
          title: subject,
          message: `Email notification sent for ticket #${ticket.ticketNumber}`,
          data: {
            ticketId,
            notificationType,
            recipients,
            messageId: result.messageId,
          },
        },
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to send ticket notification:', error);
    throw error;
  }
}

// Get email template
async function getEmailTemplate(
  type: EmailNotificationType,
  data: any
): Promise<{ subject: string; html: string }> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/tickets/${data.ticket.id}`;

  switch (type) {
    case 'ticket_created':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] New ticket created: ${data.ticket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Ticket Created</h2>
            <p>A new ticket has been created in the Bank SulutGo ServiceDesk.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Service:</strong> ${data.ticket.service?.name || 'N/A'}</p>
              <p><strong>Priority:</strong> ${data.ticket.priority}</p>
              <p><strong>Branch:</strong> ${data.ticket.branch?.name || 'N/A'}</p>
              <p><strong>Requester:</strong> ${data.ticket.createdBy.name}</p>
            </div>

            <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h4>Description:</h4>
              <p>${data.ticket.description || 'No description provided'}</p>
            </div>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk. Please do not reply to this email.
            </p>
          </div>
        `,
      };

    case 'ticket_assigned':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Assigned to you: ${data.ticket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Ticket Assigned to You</h2>
            <p>You have been assigned to work on the following ticket:</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Service:</strong> ${data.ticket.service?.name || 'N/A'}</p>
              <p><strong>Priority:</strong> ${data.ticket.priority}</p>
              <p><strong>Status:</strong> ${data.ticket.status}</p>
              <p><strong>Requester:</strong> ${data.ticket.createdBy.name}</p>
            </div>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View & Work on Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'ticket_updated':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Status updated: ${data.newStatus || data.ticket.status}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Ticket Status Updated</h2>
            <p>The status of your ticket has been updated.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Update Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>New Status:</strong> <span style="color: #007bff; font-weight: bold;">${data.newStatus || data.ticket.status}</span></p>
              ${data.previousStatus ? `<p><strong>Previous Status:</strong> ${data.previousStatus}</p>` : ''}
              ${data.updatedBy ? `<p><strong>Updated By:</strong> ${data.updatedBy}</p>` : ''}
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              ${data.updateNote ? `<p><strong>Update Note:</strong> ${data.updateNote}</p>` : ''}
            </div>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'comment_added':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] New comment added`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Comment on Your Ticket</h2>
            <p>A new comment has been added to your ticket.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
            </div>

            <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h4>Comment by ${data.comment?.user?.name || 'System'}:</h4>
              <p>${data.comment?.content || ''}</p>
              <p style="color: #666; font-size: 12px;">${data.comment?.createdAt ? new Date(data.comment.createdAt).toLocaleString() : ''}</p>
            </div>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Ticket & Reply
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'technician_action':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Technician activity on your ticket`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Technician Activity on Ticket</h2>
            <p>${data.technician?.name || 'A technician'} has performed an action on the ticket.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Status:</strong> ${data.ticket.status}</p>
              <p><strong>Technician:</strong> ${data.technician?.name || data.ticket.assignedTo?.name || 'Support Team'}</p>
            </div>

            ${data.action ? `
            <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h4>Action Performed:</h4>
              <p>${data.action}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            ` : ''}

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Ticket Details
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'ticket_resolved':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Resolved: ${data.ticket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Ticket Resolved ✅</h2>
            <p>Your ticket has been resolved.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Resolution Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Service:</strong> ${data.ticket.service?.name || 'N/A'}</p>
              <p><strong>Resolved by:</strong> ${data.updatedBy || data.ticket.assignedTo?.name || 'Support Team'}</p>
              ${data.resolutionNotes ? `<p><strong>Resolution Notes:</strong> ${data.resolutionNotes}</p>` : ''}
              ${data.reason ? `<p><strong>Additional Notes:</strong> ${data.reason}</p>` : ''}
              <p><strong>Resolved at:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px;">
              If you're satisfied with the resolution, you can close the ticket. If you need further assistance, please add a comment to reopen the discussion.
            </p>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'ticket_closed':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Closed: ${data.ticket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6c757d;">Ticket Closed</h2>
            <p>Your ticket has been closed.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Service:</strong> ${data.ticket.service?.name || 'N/A'}</p>
              <p><strong>Closed by:</strong> ${data.updatedBy || data.closedBy || data.ticket.assignedTo?.name || 'Support Team'}</p>
              ${data.reason ? `<p><strong>Closing Notes:</strong> ${data.reason}</p>` : ''}
              <p><strong>Closed at:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p style="background: #f8f9fa; border: 1px solid #dee2e6; color: #495057; padding: 15px; border-radius: 5px;">
              Thank you for using Bank SulutGo ServiceDesk. This ticket is now closed.
              If you need further assistance, please create a new ticket.
            </p>

            <p style="margin-top: 20px;">
              <a href="${baseUrl}/tickets/new" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Create New Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    case 'ticket_approved':
      return {
        subject: `[Ticket #${data.ticket.ticketNumber}] Approved: ${data.ticket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Ticket Approved ✅</h2>
            <p>The ticket has been approved and is now ready for processing.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details:</h3>
              <p><strong>Ticket Number:</strong> #${data.ticket.ticketNumber}</p>
              <p><strong>Title:</strong> ${data.ticket.title}</p>
              <p><strong>Service:</strong> ${data.ticket.service?.name || 'N/A'}</p>
              <p><strong>Priority:</strong> ${data.ticket.priority}</p>
              <p><strong>Support Group:</strong> ${data.ticket.service?.supportGroup?.name || 'N/A'}</p>
              <p><strong>Approved by:</strong> ${data.approver?.name || 'Manager'}</p>
              <p><strong>Approval Date:</strong> ${new Date().toLocaleString()}</p>
            </div>

            ${data.approvalNotes ? `
            <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h4>Approval Notes:</h4>
              <p>${data.approvalNotes}</p>
            </div>
            ` : ''}

            <p style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px;">
              <strong>Support Group Action Required:</strong><br>
              This ticket has been approved and assigned to your support group. Please review and begin processing the request.
            </p>

            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View & Process Ticket
              </a>
            </p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from Bank SulutGo ServiceDesk.
            </p>
          </div>
        `,
      };

    default:
      return {
        subject: `[ServiceDesk] Notification`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>ServiceDesk Notification</h2>
            <p>You have a new notification from Bank SulutGo ServiceDesk.</p>
            <p><a href="${baseUrl}">Visit ServiceDesk</a></p>
          </div>
        `,
      };
  }
}

// Queue email (for batch sending)
export interface QueuedEmail {
  to: string[];
  subject: string;
  html: string;
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

const emailQueue: QueuedEmail[] = [];

export function queueEmail(email: Omit<QueuedEmail, 'attempts'>) {
  emailQueue.push({
    ...email,
    attempts: 0,
  });
}

// Process email queue
export async function processEmailQueue() {
  const batch = emailQueue.splice(0, 10); // Process 10 emails at a time

  for (const email of batch) {
    try {
      await sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
      });
    } catch (error) {
      email.attempts++;
      email.lastAttempt = new Date();
      email.error = error instanceof Error ? error.message : 'Unknown error';

      // Re-queue if less than 3 attempts
      if (email.attempts < 3) {
        emailQueue.push(email);
      } else {
        console.error('Email failed after 3 attempts:', email);
      }
    }
  }
}

// Start email queue processor
if (process.env.NODE_ENV === 'production') {
  setInterval(processEmailQueue, 30000); // Process queue every 30 seconds
}