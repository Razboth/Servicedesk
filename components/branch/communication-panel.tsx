'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Send, 
  AlertCircle,
  CheckCircle2,
  Info,
  Users,
  Building2,
  Clock,
  Eye,
  Paperclip,
  Phone,
  Mail
} from 'lucide-react';

interface CommunicationPanelProps {
  ticketId: string;
  onUpdate?: () => void;
}

interface Message {
  id: string;
  messageType: string;
  subject: string;
  content: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
    branch?: {
      name: string;
      code: string;
    };
  };
  toBranch?: {
    name: string;
    code: string;
  };
  isRead: boolean;
  readBy: string[];
  createdAt: string;
  attachments?: any[];
}

const MESSAGE_TYPES = [
  { value: 'INFO', label: 'Information', icon: 'ℹ️', color: 'gray' },
  { value: 'REQUEST', label: 'Request', icon: '📋', color: 'purple' },
  { value: 'RESPONSE', label: 'Response', icon: '💬', color: 'blue' },
  { value: 'URGENT', label: 'Urgent', icon: '🚨', color: 'red' },
  { value: 'ESCALATION', label: 'Escalation', icon: '⚠️', color: 'orange' }
];

export default function CommunicationPanel({ ticketId, onUpdate }: CommunicationPanelProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showComposeForm, setShowComposeForm] = useState(false);
  const [newMessage, setNewMessage] = useState({
    messageType: 'INFO',
    subject: '',
    content: '',
    toBranchId: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    fetchBranches();
    const interval = setInterval(fetchMessages, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/collaborate`);
      if (response.ok) {
        const data = await response.json();
        // Map communications to the expected message format
        const mappedMessages = (data.communications || []).map((comm: any) => ({
          id: comm.id,
          messageType: comm.messageType,
          subject: comm.subject || '',
          content: comm.message,
          fromUser: {
            id: comm.userId,
            name: comm.user?.name || 'Unknown',
            email: comm.user?.email || '',
            branch: comm.fromBranch
          },
          toBranch: comm.toBranch,
          isRead: true, // Will be determined by readBy
          readBy: comm.readBy || [],
          createdAt: comm.createdAt,
          attachments: comm.attachments || []
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    try {
      await fetch(`/api/branch/atm-claims/${ticketId}/collaborate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.content) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/collaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.content,
          messageType: newMessage.messageType,
          toBranchId: newMessage.toBranchId || null
        })
      });

      if (response.ok) {
        toast.success('Message sent successfully');
        setNewMessage({
          messageType: 'INFO',
          subject: '',
          content: '',
          toBranchId: ''
        });
        setShowComposeForm(false);
        fetchMessages();
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (type: string) => {
    const messageType = MESSAGE_TYPES.find(t => t.value === type);
    return messageType?.icon || '💬';
  };

  const getMessageColor = (type: string) => {
    const messageType = MESSAGE_TYPES.find(t => t.value === type);
    switch (messageType?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'green': return 'bg-green-100 text-green-800';
      case 'red': return 'bg-red-100 text-red-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'orange': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <div className="space-y-6">
      {/* Compose Message */}
      {showComposeForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="messageType">Message Type</Label>
                <Select
                  value={newMessage.messageType}
                  onValueChange={(value) => setNewMessage({...newMessage, messageType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="toBranch">To Branch (Optional)</Label>
                <BranchSelect
                  branches={branches}
                  value={newMessage.toBranchId}
                  onValueChange={(value) => setNewMessage({...newMessage, toBranchId: value})}
                  placeholder="All branches"
                  allOption={true}
                  allOptionLabel="All Branches"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="Brief subject..."
              />
            </div>

            <div>
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                value={newMessage.content}
                onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                placeholder="Type your message here..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowComposeForm(false);
                  setNewMessage({
                    messageType: 'INFORMATION',
                    subject: '',
                    content: '',
                    toBranchId: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={loading || !newMessage.content}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Communication Thread
            </span>
            {!showComposeForm && (
              <Button
                size="sm"
                onClick={() => setShowComposeForm(true)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                New Message
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet</p>
                <p className="text-sm mt-2">Start a conversation with other branches</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.fromUser.id === session?.user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            message.fromUser.id === session?.user?.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200'
                          } border rounded-lg p-4`}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                {message.fromUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {message.fromUser.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {message.fromUser.branch?.code || 'HO'}
                                </Badge>
                                <Badge className={`text-xs ${getMessageColor(message.messageType)}`}>
                                  {getMessageIcon(message.messageType)} {message.messageType}
                                </Badge>
                              </div>
                              {message.toBranch && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                  <Building2 className="w-3 h-3" />
                                  To: {message.toBranch.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {message.subject && (
                            <p className="font-medium text-sm mb-2">{message.subject}</p>
                          )}

                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {message.content}
                          </p>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t">
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleString('id-ID')}
                            </span>
                            {message.readBy && message.readBy.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <Eye className="w-3 h-3" />
                                Read by {message.readBy.length}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Branch Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Help Desk</p>
                <p className="text-sm text-gray-600">0431-123456</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <p className="text-sm text-gray-600">support@banksulutgo.id</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}