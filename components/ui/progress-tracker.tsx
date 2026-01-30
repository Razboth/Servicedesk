"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { RichTextViewer } from "@/components/ui/rich-text-editor"
import { getAvatarById } from "@/components/ui/avatar-presets"
import { 
  Clock, 
  User, 
  Play, 
  CheckCircle, 
  XCircle, 
  Pause,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  HourglassIcon,
  CheckCheck,
  MessageSquare
} from "lucide-react"

interface ProgressStep {
  id: string
  label: string
  status: "completed" | "current" | "pending" | "skipped"
  timestamp?: string
  user?: {
    name: string
    email: string
    role?: string
  }
  description?: string
  reason?: string
  comments?: Array<{
    id: string
    content: string
    user: {
      name: string
      role: string
    }
    createdAt: string
  }>
}

interface ProgressTrackerProps {
  steps: ProgressStep[]
  currentStatus: string
  className?: string
  variant?: "horizontal" | "vertical"
  showTimestamps?: boolean
  showUsers?: boolean
  ticketData?: {
    createdAt: string
    updatedAt: string
    resolvedAt?: string
    closedAt?: string
    claimedAt?: string
    approvals?: Array<{
      status: string
      createdAt: string
      updatedAt: string
      reason?: string
      approver: {
        name: string
        email: string
        role: string
      }
    }>
    createdBy?: {
      name: string
      email: string
    }
    assignedTo?: {
      name: string
      email: string
    }
    comments?: Array<{
      id: string
      content: string
      isInternal: boolean
      createdAt: string
      user: {
        name: string
        email: string
        role: string
      }
    }>
  }
}

const statusIcons: Record<string, React.ReactNode> = {
  "OPEN": <Clock className="w-4 h-4" />,
  "PENDING": <HourglassIcon className="w-4 h-4" />,
  "PENDING_APPROVAL": <AlertCircle className="w-4 h-4" />,
  "APPROVED": <ThumbsUp className="w-4 h-4" />,
  "REJECTED": <ThumbsDown className="w-4 h-4" />,
  "IN_PROGRESS": <Play className="w-4 h-4" />,
  "PENDING_VENDOR": <Pause className="w-4 h-4" />,
  "RESOLVED": <CheckCheck className="w-4 h-4" />,
  "CLOSED": <CheckCircle className="w-4 h-4" />,
  "CANCELLED": <XCircle className="w-4 h-4" />
}

const statusColors: Record<string, string> = {
  "OPEN": "bg-amber-500 text-white dark:bg-amber-400 dark:text-brown-950",
  "PENDING": "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-brown-950",
  "PENDING_APPROVAL": "bg-orange-500 text-white dark:bg-orange-400 dark:text-brown-950", 
  "APPROVED": "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-brown-950",
  "REJECTED": "bg-red-500 text-white dark:bg-red-400 dark:text-brown-950",
  "IN_PROGRESS": "bg-brown-500 text-white dark:bg-brown-400 dark:text-brown-950",
  "PENDING_VENDOR": "bg-purple-500 text-white dark:bg-purple-400 dark:text-brown-950",
  "RESOLVED": "bg-teal-500 text-white dark:bg-teal-400 dark:text-brown-950",
  "CLOSED": "bg-green-500 text-white dark:bg-green-400 dark:text-brown-950",
  "CANCELLED": "bg-gray-500 text-white dark:bg-gray-400 dark:text-brown-950"
}

// Helper function to generate user initials
const getUserInitials = (name: string): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper function to format duration between two dates
const formatDuration = (startDate: string | Date, endDate: string | Date = new Date()): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()

  if (diffMs < 0) return '0m'

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days}d`
    return `${days}d ${remainingHours}h`
  }

  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

// Helper function to filter technician comments for a specific step
const getCommentsForStep = (stepId: string, ticketData?: any): Array<{id: string, content: string, user: {name: string, role: string}, createdAt: string}> => {
  if (!ticketData?.comments) return []
  
  // Filter comments from technicians and security analysts only
  const technicianComments = ticketData.comments.filter((comment: any) => 
    ['TECHNICIAN', 'SECURITY_ANALYST'].includes(comment.user.role) && !comment.isInternal
  )
  
  // For now, associate all technician comments with IN_PROGRESS step
  // In the future, this could be enhanced to match comments based on timing
  if (stepId === 'IN_PROGRESS') {
    return technicianComments.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user: {
        name: comment.user.name,
        role: comment.user.role
      },
      createdAt: comment.createdAt
    }))
  }
  
  return []
}

// Define typical ticket workflow steps
const getDefaultSteps = (currentStatus: string, ticketData?: any): ProgressStep[] => {
  const hasApprovals = ticketData?.approvals && ticketData.approvals.length > 0
  const latestApproval = hasApprovals ? ticketData.approvals[0] : null
  
  // Build workflow based on ticket history
  const steps: ProgressStep[] = []
  
  // Always start with creation
  steps.push({
    id: "OPEN",
    label: "Created",
    status: "completed",
    timestamp: ticketData?.createdAt,
    user: ticketData?.createdBy
  })
  
  // Check if ticket went through approval process
  if (hasApprovals || currentStatus === 'PENDING_APPROVAL') {
    // Calculate duration for pending approval
    const pendingDuration = currentStatus === 'PENDING_APPROVAL' && ticketData?.createdAt
      ? formatDuration(ticketData.createdAt)
      : latestApproval?.updatedAt && ticketData?.createdAt
        ? formatDuration(ticketData.createdAt, latestApproval.updatedAt)
        : undefined

    steps.push({
      id: "PENDING_APPROVAL",
      label: "Pending Approval",
      status: currentStatus === 'PENDING_APPROVAL' ? "current" : latestApproval ? "completed" : "pending",
      timestamp: latestApproval?.createdAt,
      description: currentStatus === 'PENDING_APPROVAL'
        ? `Waiting for manager approval (${pendingDuration || 'just now'})`
        : pendingDuration
          ? `Waited ${pendingDuration} for approval`
          : undefined
    })

    if (latestApproval) {
      if (latestApproval.status === 'APPROVED') {
        steps.push({
          id: "APPROVED",
          label: "Approved",
          status: "completed",
          timestamp: latestApproval.updatedAt,
          user: latestApproval.approver,
          description: `Approved by ${latestApproval.approver.name}`
        })
      } else if (latestApproval.status === 'REJECTED') {
        steps.push({
          id: "REJECTED",
          label: "Rejected",
          status: currentStatus === 'REJECTED' ? "current" : "completed",
          timestamp: latestApproval.updatedAt,
          user: latestApproval.approver,
          description: latestApproval.reason || "Rejected by manager",
          reason: latestApproval.reason
        })
        // If rejected, don't add further steps unless it's been reopened
        if (currentStatus === 'REJECTED') {
          return steps
        }
      }
    }
  }
  
  // Add standard workflow steps
  if (currentStatus !== 'REJECTED' && currentStatus !== 'CANCELLED') {
    // Calculate processing duration for In Progress step
    const inProgressEndTime = ticketData?.closedAt || ticketData?.resolvedAt
    const processingDuration = ticketData?.claimedAt
      ? formatDuration(ticketData.claimedAt, inProgressEndTime || new Date())
      : undefined

    // Determine In Progress status - use claimedAt to persist the state
    const inProgressStatus = getStepStatus("IN_PROGRESS", currentStatus, steps)
    const hasBeenClaimed = !!ticketData?.claimedAt || !!ticketData?.assignedTo

    steps.push({
      id: "IN_PROGRESS",
      label: "In Progress",
      status: hasBeenClaimed && inProgressStatus === "pending" ? "completed" : inProgressStatus,
      timestamp: ticketData?.claimedAt,
      user: ticketData?.assignedTo,
      description: ticketData?.claimedAt
        ? inProgressEndTime
          ? `Processed in ${processingDuration}`
          : `Processing for ${processingDuration}`
        : ticketData?.assignedTo
          ? `Assigned to ${ticketData.assignedTo.name}`
          : undefined,
      comments: getCommentsForStep("IN_PROGRESS", ticketData)
    })

    steps.push({
      id: "RESOLVED",
      label: "Resolved",
      status: getStepStatus("RESOLVED", currentStatus, steps),
      timestamp: ticketData?.resolvedAt,
      user: ticketData?.assignedTo, // Usually the assigned technician resolves the ticket
      description: ticketData?.resolvedAt
        ? `Ticket resolved ${ticketData.assignedTo?.name ? `by ${ticketData.assignedTo.name}` : ''}`
        : undefined,
      comments: getCommentsForStep("RESOLVED", ticketData)
    })

    steps.push({
      id: "CLOSED",
      label: "Closed",
      status: getStepStatus("CLOSED", currentStatus, steps),
      timestamp: ticketData?.closedAt,
      user: ticketData?.assignedTo, // Usually the assigned technician closes the ticket
      description: ticketData?.closedAt
        ? `Ticket closed and marked as complete ${ticketData.assignedTo?.name ? `by ${ticketData.assignedTo.name}` : ''}`
        : undefined,
      comments: getCommentsForStep("CLOSED", ticketData)
    })
  }
  
  // Handle cancelled tickets
  if (currentStatus === 'CANCELLED') {
    steps.push({
      id: "CANCELLED",
      label: "Cancelled",
      status: "current",
      timestamp: ticketData?.updatedAt
    })
  }
  
  return steps
}

// Helper function to determine step status
const getStepStatus = (stepId: string, currentStatus: string, existingSteps: ProgressStep[]): "completed" | "current" | "pending" => {
  const statusOrder = ["OPEN", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS", "RESOLVED", "CLOSED"]
  const stepIndex = statusOrder.indexOf(stepId)
  const currentIndex = statusOrder.indexOf(currentStatus)
  
  if (stepId === currentStatus) {
    return "current"
  } else if (stepIndex < currentIndex) {
    return "completed"
  } else {
    return "pending"
  }
}

export const ProgressTracker = React.forwardRef<
  HTMLDivElement,
  ProgressTrackerProps
>(({ 
  steps: providedSteps, 
  currentStatus, 
  className, 
  variant = "horizontal",
  showTimestamps = true,
  showUsers = false,
  ticketData,
  ...props 
}, ref) => {
  // Use provided steps or generate default ones
  const steps = providedSteps.length > 0 ? providedSteps : getDefaultSteps(currentStatus, ticketData)

  if (variant === "vertical") {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 relative">
                {step.user && (step.user as any)?.avatar && getAvatarById((step.user as any).avatar) ? (
                  <div className="w-full h-full scale-90">
                    {getAvatarById((step.user as any).avatar)?.component}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-full h-full rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-md",
                      step.status === "completed" && statusColors[step.id] || "bg-green-500 text-white",
                      step.status === "current" && statusColors[step.id] || "bg-amber-500 text-white dark:bg-amber-400 dark:text-brown-950 animate-pulse",
                      step.status === "pending" && "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                      step.status === "skipped" && "bg-gray-300 text-gray-400 dark:bg-gray-600"
                    )}
                  >
                    {step.user && step.user.name ? 
                      getUserInitials(step.user.name) : 
                      (statusIcons[step.id] || (index + 1))
                    }
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-12 mt-2 transition-colors duration-300",
                    step.status === "completed" 
                      ? "bg-green-500" 
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}
            </div>
            
            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "font-medium transition-colors",
                  step.status === "completed" && "text-brown-600 dark:text-brown-400",
                  step.status === "current" && "text-amber-600 dark:text-amber-400",
                  step.status === "pending" && "text-gray-500 dark:text-gray-400",
                  step.status === "skipped" && "text-gray-400 line-through"
                )}>
                  {step.label}
                </h4>
                {showTimestamps && step.timestamp && (
                  <span className="text-xs text-gray-400">
                    {step.timestamp}
                  </span>
                )}
              </div>
              
              {step.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {step.description}
                </p>
              )}
              
              {step.reason && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">
                  Reason: {step.reason}
                </p>
              )}
              
              {/* Always show user info for key steps */}
              {step.user && (step.id === 'OPEN' || step.id === 'APPROVED' || step.id === 'RESOLVED' || step.id === 'CLOSED' || showUsers) && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {step.user.name} {step.user.role && `(${step.user.role})`}
                  </span>
                </div>
              )}
              
              {step.comments && step.comments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Technician Updates
                  </div>
                  {step.comments.map((comment) => (
                    <div key={comment.id} className="bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-200 dark:border-amber-700 p-2 rounded-r">
                      <RichTextViewer content={comment.content} className="text-sm text-gray-700 dark:text-gray-300 mb-1" />
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{comment.user.name} ({comment.user.role})</span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Horizontal layout
  return (
    <div
      ref={ref}
      className={cn("", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 relative">
                {step.user && (step.user as any)?.avatar && getAvatarById((step.user as any).avatar) ? (
                  <div className="w-full h-full scale-90">
                    {getAvatarById((step.user as any).avatar)?.component}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-full h-full rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-md",
                      step.status === "completed" && statusColors[step.id] || "bg-green-500 text-white",
                      step.status === "current" && statusColors[step.id] || "bg-amber-500 text-white dark:bg-amber-400 dark:text-brown-950 animate-pulse",
                      step.status === "pending" && "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                      step.status === "skipped" && "bg-gray-300 text-gray-400 dark:bg-gray-600"
                    )}
                  >
                    {step.user && step.user.name ? 
                      getUserInitials(step.user.name) : 
                      (statusIcons[step.id] || (index + 1))
                    }
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={cn(
                  "text-sm font-medium transition-colors",
                  step.status === "completed" && "text-brown-600 dark:text-brown-400",
                  step.status === "current" && "text-amber-600 dark:text-amber-400",
                  step.status === "pending" && "text-gray-500 dark:text-gray-400",
                  step.status === "skipped" && "text-gray-400 line-through"
                )}>
                  {step.label}
                </div>
                {showTimestamps && step.timestamp && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {step.timestamp}
                  </div>
                )}
                {showUsers && step.user && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {step.user.name}
                  </div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors duration-300",
                  step.status === "completed" 
                    ? "bg-green-500" 
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

ProgressTracker.displayName = "ProgressTracker"

export default ProgressTracker