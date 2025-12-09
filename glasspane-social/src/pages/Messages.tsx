import { useState, useEffect, useRef } from "react";
import { Send, Image, Smile, Phone, Video, MoreVertical, Search, Plus, X, Mic, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { ChatMessage } from "@/components/messages/ChatMessage";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

const Messages = () => {
  const { dbUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Media states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (dbUser?.id) {
      loadConversations();
    }
  }, [dbUser]);

  useEffect(() => {
    if (!socket || !dbUser?.id) return;

    socket.on(`new_message_${dbUser.id}`, (message: any) => {
      // Update messages if chat is open
      if (activeConversation && (message.sender_id === activeConversation.id || message.recipient_id === activeConversation.id)) {
        setMessages(prev => {
          // Avoid duplicates for own messages (already added optimistically)
          const isDuplicate = prev.some(m =>
            m.id === message.id ||
            (m.sender_id === dbUser.id && m.content === message.content && Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 2000)
          );
          if (isDuplicate) return prev;

          return [...prev, { ...message, isOwn: message.sender_id === dbUser.id }];
        });
        scrollToBottom();
      }
      // Reload conversations to update last message/unread
      loadConversations();
    });

    return () => {
      socket.off(`new_message_${dbUser.id}`);
    };
  }, [socket, dbUser, activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const loadConversations = async () => {
    if (!dbUser?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/conversations/${dbUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (otherUserId: number) => {
    if (!dbUser?.id) return;
    setLoadingMessages(true);
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${dbUser.id}/${otherUserId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({ ...msg, isOwn: msg.sender_id === dbUser.id })));
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (type: 'text' | 'image' | 'audio' = 'text', contentOrUrl: string = newMessage) => {
    if ((!contentOrUrl.trim() && type === 'text') || !dbUser || !activeConversation) return;

    const messageData = {
      sender_id: dbUser.id,
      recipient_id: activeConversation.id,
      content: type === 'text' ? contentOrUrl : '',
      type,
      media_url: type !== 'text' ? contentOrUrl : null
    };

    try {
      // Optimistic update
      const tempMsg = {
        ...messageData,
        created_at: new Date().toISOString(),
        isOwn: true,
        id: Date.now() // temp id
      };
      setMessages(prev => [...prev, tempMsg]);
      scrollToBottom();
      setNewMessage("");

      await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      loadConversations(); // Update list
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage('image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSendMessage('audio', reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      recordingTimer.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const handleAcceptRequest = async () => {
    if (!dbUser || !activeConversation) return;
    try {
      await fetch('http://localhost:5000/api/conversations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1_id: dbUser.id, user2_id: activeConversation.id })
      });
      // Update local state
      setActiveConversation(prev => ({ ...prev, status: 'accepted' }));
      loadConversations();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const searchUsers = async (q: string) => {
    if (!q.trim()) return;
    try {
      const response = await fetch(`http://localhost:5000/api/search-users?q=${q}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users.filter((u: any) => u.id !== dbUser?.id));
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (user: any) => {
    const existing = conversations.find(c => c.id === user.id);
    if (existing) {
      setActiveConversation(existing);
    } else {
      const newConv = {
        id: user.id,
        avatar: user.avatar || user.profile_picture_url,
        username: user.username,
        lastMessage: "Nuevo chat",
        timeAgo: "ahora",
        isOnline: false,
        status: 'pending'
      };
      setConversations([newConv, ...conversations]);
      setActiveConversation(newConv);
    }
    setShowNewChat(false);
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    if (!dbUser?.id) return;

    try {
      await fetch(`http://localhost:5000/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: dbUser.id, emoji })
      });

      // Update local state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find((r: any) => r.user_id === dbUser.id);

          if (existingReaction) {
            // Update or remove
            if (existingReaction.emoji === emoji) {
              return { ...msg, reactions: reactions.filter((r: any) => r.user_id !== dbUser.id) };
            } else {
              return { ...msg, reactions: reactions.map((r: any) => r.user_id === dbUser.id ? { ...r, emoji } : r) };
            }
          } else {
            // Add new
            return { ...msg, reactions: [...reactions, { user_id: dbUser.id, emoji }] };
          }
        }
        return msg;
      }));
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [mediaRecorder, isRecording]);

  return (
    <MainLayout>
      <div className="messages-container flex-1 min-h-0 flex h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-2rem)] lg:m-4 lg:gap-4 bg-background overflow-hidden lg:overflow-visible lg:rounded-xl">
        {/* Conversations List */}
        <div className={cn(
          "w-full lg:w-80 flex flex-col overflow-hidden flex-shrink-0 min-h-0",
          "bg-background lg:glass-card lg:rounded-lg lg:border-r lg:border-border",
          "lg:block",
          activeConversation ? "hidden lg:block" : "block h-full"
        )}>
          <div className="p-4 border-b border-border hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Mensajes</h1>
              <button
                onClick={() => setShowNewChat(true)}
                className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Mobile search bar */}
          <div className="p-3 border-b border-border lg:hidden sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-10 h-10"
                />
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className="active:bg-accent/50 lg:active:bg-transparent transition-colors"
                >
                  <ConversationItem
                    {...conv}
                    avatar={conv.avatar || conv.profile_picture_url || conv.avatar_url}
                    isActive={activeConversation?.id === conv.id}
                  />
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">No hay conversaciones</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversation ? (
          <div className={cn(
            "messages-area flex-1 flex flex-col overflow-hidden min-h-0 h-full justify-between",
            "w-full lg:w-auto",
            "bg-background lg:glass-card lg:rounded-lg lg:border lg:border-border/60",
            activeConversation ? "block" : "hidden lg:flex"
          )}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 lg:p-4 border-b border-border bg-background/95 lg:bg-background/95 backdrop-blur-sm shadow-sm z-10">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="lg:hidden w-9 h-9 -ml-1 rounded-full hover:bg-accent flex items-center justify-center active:scale-95 transition-all"
                >
                  <ArrowLeft size={22} />
                </button>

                <div className="relative">
                  <img
                    src={activeConversation.avatar || activeConversation.profile_picture_url || activeConversation.avatar_url}
                    alt={activeConversation.username}
                    className="w-9 h-9 lg:w-10 lg:h-10 rounded-full object-cover"
                  />
                  {onlineUsers.has(activeConversation.id) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm lg:text-base">{activeConversation.username}</p>
                  <p className="text-[11px] lg:text-xs text-muted-foreground">
                    {onlineUsers.has(activeConversation.id) ? "En línea" : "Desconectado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-full hover:bg-accent active:scale-95 flex items-center justify-center transition-all">
                  <Phone className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                </button>
                <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-full hover:bg-accent active:scale-95 flex items-center justify-center transition-all">
                  <Video className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                </button>
                <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-full hover:bg-accent active:scale-95 flex items-center justify-center transition-all">
                  <MoreVertical className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Request Status */}
            {activeConversation.status === 'pending' && (
              <div className="bg-accent/30 p-3 text-center text-sm border-b border-border">
                <p className="mb-2 text-xs text-muted-foreground">Solicitud de mensaje pendiente</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={handleAcceptRequest} className="bg-primary text-primary-foreground h-8 text-xs">
                    Aceptar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs">Rechazar</Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 lg:px-4 pt-4 pb-20 lg:py-6 space-y-3 lg:space-y-4 bg-background">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-sm">Cargando mensajes...</p>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id || i}
                    id={msg.id}
                    content={msg.content}
                    timeAgo={msg.timeAgo}
                    isOwn={msg.isOwn}
                    read={msg.read}
                    is_read={msg.is_read}
                    type={msg.type}
                    media_url={msg.media_url}
                    reactions={msg.reactions || []}
                    onReaction={(emoji) => handleReaction(msg.id, emoji)}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-sm">No hay mensajes aún</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-3 lg:static lg:p-4 border-t border-border bg-background/95 lg:bg-background/95 backdrop-blur-sm safe-area-bottom shadow-sm">
              {isRecording && (
                <div className="absolute bottom-full left-0 right-0 flex items-center gap-3 text-xs font-semibold text-red-500 mb-2 px-4 py-2 bg-background/95 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Grabando audio... {formatSeconds(recordingSeconds)}
                  <button
                    onClick={stopRecording}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-red-500 text-white active:scale-95 transition-transform"
                  >
                    Detener
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2.5 lg:gap-3 px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-2xl bg-muted/60 border border-border/70 lg:glass-input lg:rounded-lg shadow-inner">
                <button className="text-muted-foreground hover:text-foreground active:scale-95 transition-all p-1.5">
                  <Smile size={20} className="lg:w-[22px] lg:h-[22px]" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Mensaje..."
                  className="flex-1 bg-transparent outline-none text-[15px] lg:text-base"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground active:scale-95 transition-all p-1.5"
                >
                  <Image size={20} className="lg:w-[22px] lg:h-[22px]" />
                </button>

                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => isRecording && stopRecording()}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={cn(
                    "text-muted-foreground hover:text-foreground active:scale-95 transition-all p-1.5",
                    isRecording && "text-red-500 animate-pulse"
                  )}
                >
                  <Mic size={20} className="lg:w-[22px] lg:h-[22px]" />
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim()}
                  className={cn(
                    "w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
                    newMessage.trim()
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Send size={16} className="lg:w-[18px] lg:h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 glass-card flex-col items-center justify-center text-muted-foreground rounded-lg">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="mb-4 opacity-30">
              <path d="M48 8C25.9 8 8 25.9 8 48s17.9 40 40 40 40-17.9 40-40S70.1 8 48 8zm0 72c-17.6 0-32-14.4-32-32s14.4-32 32-32 32 14.4 32 32-14.4 32-32 32z" fill="currentColor" />
              <path d="M64 34H32c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V38c0-2.2-1.8-4-4-4zm-4 20H36V42h24v12z" fill="currentColor" />
            </svg>
            <p className="text-lg font-medium">Tus mensajes</p>
            <p className="text-sm mt-1">Envía mensajes privados a tus amigos</p>
          </div>
        )}

        {/* New Chat Dialog */}
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo mensaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Buscar usuario..."
                onChange={(e) => searchUsers(e.target.value)}
              />
              {availableUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground/50 hover:bg-accent/30 transition-all"
                >
                  <img src={user.avatar || user.profile_picture_url || user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Messages;
