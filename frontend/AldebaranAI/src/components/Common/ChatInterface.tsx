import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User } from "lucide-react"
import type { ChatRequest, MessageResponse, ConversationResponse } from "@/types/conversation"
import messageService from "@/services/messageService"
import conversationService from "@/services/conversationService"
import useAuth from "@/hooks/useAuth"
import { useParams } from "react-router-dom"

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = async (id: number) => {
    try {
      const conversations = await conversationService.getUserConversations();
      const conversation = conversations.find(conv => conv.conversationId === id);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    } catch (error: any) {
      console.error("Failed to fetch conversation:", error?.message);
    }
  };

  const fetchMessages = async (id: number) => {
    setIsLoading(true);
    try {
      const conversationMessages = await messageService.getConversationMessages(id);
      setMessages(conversationMessages);
      console.log("Successfully fetched conversation messages");
    } catch (error: any) {
      console.error("Failed to fetch messages:", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || isSending) return;

    const chatRequest: ChatRequest = {
      message: newMessage.trim(),
      createdAt: Date.now()
    };

    setIsSending(true);
    const userMessage = newMessage;
    setNewMessage("");

    try {
      const responseMessages = await messageService.sendMessage(
        chatRequest, 
        parseInt(conversationId)
      );
      
      // Your backend returns all messages, so replace the entire list
      setMessages(responseMessages);
      
      console.log("Message sent successfully");
    } catch (error: any) {
      console.error("Failed to send message:", error?.message);
      // Restore the message if sending failed
      setNewMessage(userMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (conversationId) {
      const id = parseInt(conversationId);
      fetchConversation(id);
      fetchMessages(id);
    } else {
      setMessages([]);
      setSelectedConversation(null);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show welcome screen when on /ai/conversations (no conversationId)
  if (!conversationId) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Welcome to AldebaranAI
          </h3>
          <p className="text-gray-500">
            Select a conversation from the sidebar or create a new one to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-screen ${className}`}>
      {/* Chat Header */}
      <div className="border-b bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center">
          <Bot className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedConversation?.name || "Loading..."}
            </h2>
            <p className="text-sm text-gray-500">
              AI Assistant • Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6">
          <div className="py-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-sm text-gray-500">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <Bot className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.senderType === 'USER' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`
                      ${message.senderType === 'USER' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-white'
                      }
                    `}>
                      {message.senderType === 'USER' ? (
                        user?.userName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.senderType === 'USER'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderType === 'USER' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-600 text-white">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending}
              className="min-h-[44px] resize-none"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="h-[44px] px-4"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}