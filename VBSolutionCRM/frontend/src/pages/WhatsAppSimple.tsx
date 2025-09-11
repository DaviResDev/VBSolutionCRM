"use client";
import { 
  MessageCircle, 
  Search, 
  Wifi, 
  Paperclip, 
  Mic, 
  Smile, 
  Send, 
  Image, 
  File, 
  Video, 
  Music,
  X,
  Play,
  Pause
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

const OWNER_ID = "95d595b4-3fad-4025-b76e-a54b69c84d2b";

// Preview generator
function getMessagePreview(message?: any): string {
  if (!message) return "Nenhuma mensagem";
  const tipo = String(message.message_type || "").toUpperCase();
  const conteudo = message.conteudo || "";
  switch (tipo) {
    case "TEXTO": return conteudo.slice(0, 50);
    case "IMAGEM": return `🖼️ Foto${conteudo ? ": " + conteudo.slice(0, 30) : ""}`;
    case "VIDEO": return `🎬 Vídeo${conteudo ? ": " + conteudo.slice(0, 30) : ""}`;
    case "AUDIO": return `🎧 Áudio${message.duration_ms ? " (" + Math.round(message.duration_ms/1000) + "s)" : ""}`;
    case "STICKER": return "💟 Figurinha";
    case "ARQUIVO": return `📎 Arquivo${conteudo ? ": " + conteudo.slice(0, 30) : ""}`;
    case "LOCALIZACAO": return "📍 Localização";
    default: return conteudo.slice(0, 50) || "Mensagem";
  }
}

// Message content renderer
function MessageContent({ message, isPlayingAudio, toggleAudioPlayback }: { 
  message: any; 
  isPlayingAudio: string | null; 
  toggleAudioPlayback: (id: string) => void;
}) {
  const tipo = String(message.message_type || "").toUpperCase();
  
  switch (tipo) {
    case "IMAGEM":
      return (
        <div className="space-y-2">
          {message.file ? (
            <img 
              src={URL.createObjectURL(message.file)} 
              alt="Imagem" 
              className="max-w-xs rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {message.conteudo && <p className="text-sm">{message.conteudo}</p>}
        </div>
      );
    
    case "VIDEO":
      return (
        <div className="space-y-2">
          {message.file ? (
            <video 
              src={URL.createObjectURL(message.file)} 
              controls 
              className="max-w-xs rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {message.conteudo && <p className="text-sm">{message.conteudo}</p>}
        </div>
      );
    
    case "AUDIO":
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
          <button 
            onClick={() => message.audioBlob && toggleAudioPlayback(message.id)}
            className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors"
          >
            {isPlayingAudio === message.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">0:15 / 0:30</p>
          </div>
        </div>
      );
    
    case "ARQUIVO":
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
          <File className="w-6 h-6 text-gray-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{message.conteudo}</p>
            <p className="text-xs text-gray-500">Arquivo</p>
          </div>
        </div>
      );
    
    default:
      return <p className="text-sm leading-relaxed">{message.conteudo}</p>;
  }
}

export default function WhatsAppSimple() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom only when new messages are added (not when selecting conversation)
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  
  useEffect(() => {
    // Only auto-scroll if we should auto-scroll and messages increased
    if (shouldAutoScroll && messages.length > previousMessageCount && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setPreviousMessageCount(messages.length);
  }, [messages.length, previousMessageCount, shouldAutoScroll]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simular dados para teste
      const mockConversations = [
        {
          id: "1",
          chat_id: "5511999999999@s.whatsapp.net",
          nome_cliente: "João Silva",
          numero_cliente: "5511999999999",
          status: "Ativo",
          lastMessageAt: new Date().toISOString(),
          lastMessage: {
            conteudo: "Olá, como posso ajudar?",
            message_type: "TEXTO"
          },
          unread: 2,
          total_messages: 5
        },
        {
          id: "2", 
          chat_id: "5511888888888@s.whatsapp.net",
          nome_cliente: "Maria Santos",
          numero_cliente: "5511888888888",
          status: "Ativo",
          lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
          lastMessage: {
            conteudo: "Obrigada pelo atendimento!",
            message_type: "TEXTO"
          },
          unread: 0,
          total_messages: 3
        }
      ];
      
      setConversations(mockConversations);
    } catch (e: any) {
      console.error("[loadConversations] error:", e);
      setError(e?.message || "Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async (chatId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Simular mensagens para teste
      const mockMessages = [
        {
          id: "1",
          chat_id: chatId,
          conteudo: "Olá, como posso ajudar?",
          message_type: "TEXTO",
          remetente: "OPERADOR",
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: "2",
          chat_id: chatId,
          conteudo: "Preciso de ajuda com meu pedido",
          message_type: "TEXTO",
          remetente: "CLIENTE",
          timestamp: new Date(Date.now() - 180000).toISOString()
        },
        {
          id: "3",
          chat_id: chatId,
          conteudo: "Claro! Qual é o número do seu pedido?",
          message_type: "TEXTO",
          remetente: "OPERADOR",
          timestamp: new Date(Date.now() - 120000).toISOString()
        }
      ];
      
      setMessages(mockMessages);
    } catch (e: any) {
      console.error("[loadMessages] error:", e);
      setError(e?.message || "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Search filter
  const filtered = useMemo(() => {
    if (!conversations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(conv =>
      (conv.nome_cliente || "").toLowerCase().includes(q) ||
      (conv.numero_cliente || "").toLowerCase().includes(q) ||
      (conv.lastMessage?.conteudo || "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // Select conversation
  const selectConversation = useCallback(async (chatId: string) => {
    const conv = conversations.find(c => c.chat_id === chatId);
    if (!conv) return;
    
    // Reset auto-scroll flag when selecting conversation
    setShouldAutoScroll(false);
    setActiveConversation(conv);
    await loadMessages(chatId);
  }, [conversations, loadMessages]);

  // Audio recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // File handling
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    setShowAttachmentMenu(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Audio playback
  const toggleAudioPlayback = useCallback((messageId: string) => {
    if (isPlayingAudio === messageId) {
      setIsPlayingAudio(null);
    } else {
      setIsPlayingAudio(messageId);
    }
  }, [isPlayingAudio]);

  // Send message with attachments
  const handleSend = useCallback(async () => {
    if ((!text.trim() && selectedFiles.length === 0 && !audioBlob) || !activeConversation?.chat_id) return;
    
    // Enable auto-scroll when sending new messages
    setShouldAutoScroll(true);
    
    // Send text message
    if (text.trim()) {
      const newMessage = {
        id: `opt-${Date.now()}`,
        chat_id: activeConversation.chat_id,
        conteudo: text.trim(),
        message_type: "TEXTO",
        remetente: "OPERADOR",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setText("");
    }

    // Send files
    selectedFiles.forEach((file, index) => {
      const messageType = file.type.startsWith('image/') ? 'IMAGEM' : 
                         file.type.startsWith('video/') ? 'VIDEO' : 
                         file.type.startsWith('audio/') ? 'AUDIO' : 'ARQUIVO';
      
      const newMessage = {
        id: `opt-${Date.now()}-${index}`,
        chat_id: activeConversation.chat_id,
        conteudo: file.name,
        message_type: messageType,
        remetente: "OPERADOR",
        timestamp: new Date().toISOString(),
        file: file
      };
      
      setMessages(prev => [...prev, newMessage]);
    });

    // Send audio
    if (audioBlob) {
      const newMessage = {
        id: `opt-${Date.now()}-audio`,
        chat_id: activeConversation.chat_id,
        conteudo: "Gravação de áudio",
        message_type: "AUDIO",
        remetente: "OPERADOR",
        timestamp: new Date().toISOString(),
        audioBlob: audioBlob
      };
      
      setMessages(prev => [...prev, newMessage]);
      setAudioBlob(null);
    }

    setSelectedFiles([]);
  }, [text, selectedFiles, audioBlob, activeConversation?.chat_id]);

  // Helpers
  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / (1000 * 60);
    if (diff < 60) return `${Math.floor(diff)}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600">
        Erro ao carregar conversas: {error}
        <button onClick={() => loadConversations()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 h-screen bg-gray-50 overflow-hidden">
      {/* Left column - conversation list */}
      <div className="col-span-2 bg-white border-r border-gray-200 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Conversas</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600">Conectado</span>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div className="p-2">
              {filtered.map(conv => (
                <button
                  key={conv.chat_id}
                  onClick={() => selectConversation(conv.chat_id)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 mb-1 ${
                    activeConversation?.chat_id === conv.chat_id 
                      ? "bg-green-50 border border-green-200 shadow-sm" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {getInitials(conv.nome_cliente || conv.numero_cliente)}
                      </div>
                      {conv.unread > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {conv.unread > 99 ? "99+" : conv.unread}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate text-sm">
                          {conv.nome_cliente || conv.numero_cliente}
                        </h3>
                        <span className="text-xs text-gray-500 font-medium">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {getMessagePreview(conv.lastMessage)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center - messages */}
      <div className="col-span-7 flex flex-col bg-white min-h-0 h-screen">
        {activeConversation?.chat_id ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white shadow-sm flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                  {getInitials(activeConversation?.nome_cliente || activeConversation?.numero_cliente || "C")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900 text-lg">
                      {activeConversation?.nome_cliente || activeConversation?.numero_cliente}
                    </h2>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {activeConversation?.chat_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 min-h-0"
              onScroll={() => {
                // Disable auto-scroll if user manually scrolls up
                const element = messagesEndRef.current?.parentElement;
                if (element) {
                  const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
                  setShouldAutoScroll(isAtBottom);
                }
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm text-gray-400">Inicie uma conversa enviando uma mensagem</p>
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.remetente === "CLIENTE" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        m.remetente === "CLIENTE"
                          ? "bg-white text-gray-900 border border-gray-100"
                          : "bg-gradient-to-r from-green-500 to-green-600 text-white"
                      }`}>
                        <MessageContent 
                          message={m} 
                          isPlayingAudio={isPlayingAudio}
                          toggleAudioPlayback={toggleAudioPlayback}
                        />
                        <p className={`text-xs mt-2 ${
                          m.remetente === "CLIENTE" ? "text-gray-500" : "text-green-100"
                        }`}>
                          {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0 relative z-10">
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Anexos selecionados:</span>
                    <button 
                      onClick={() => setSelectedFiles([])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                        <File className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate max-w-32">{file.name}</span>
                        <button 
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Preview */}
              {audioBlob && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Gravação de áudio:</span>
                    <button 
                      onClick={() => setAudioBlob(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Play className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">0:15 / 0:30</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="flex items-end gap-3">
                {/* Attachment Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  {showAttachmentMenu && (
                    <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-10">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <Image className="w-4 h-4" />
                        Foto/Vídeo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <File className="w-4 h-4" />
                        Arquivo
                      </button>
                    </div>
                  )}
                </div>

                {/* Text Input */}
                <div className="flex-1 relative">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Digite sua mensagem..."
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-full text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all duration-200 resize-none"
                  />
                </div>

                {/* Emoji Button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Audio/Record Button */}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!text.trim() && selectedFiles.length === 0 && !audioBlob}
                  className="p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500 max-w-md mx-auto px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Selecione uma conversa</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Escolha uma conversa da lista ao lado para começar a enviar mensagens e gerenciar o atendimento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right column - contact details */}
      <div className="col-span-3 bg-white border-l border-gray-200 hidden xl:block flex flex-col min-h-0">
        {activeConversation ? (
          <div className="h-full flex flex-col min-h-0">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes do Contato</h3>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              
              {/* Contact Profile */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {getInitials(activeConversation.nome_cliente || activeConversation.numero_cliente)}
                  </span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-1">
                  {activeConversation.nome_cliente || "Contato"}
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  {activeConversation.numero_cliente || "Número não disponível"}
                </p>
                
                <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors">
                  Todo Histórico De Canais
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-0">
              {/* Status Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Inscrito</p>
                    <p className="text-xs text-gray-500">Cancelar a inscrição</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hora do Contato</p>
                    <p className="text-xs text-gray-500">Desconhecido</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">ID do Contato</p>
                    <p className="text-xs text-gray-500">209043083</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Optou pelo WhatsApp</p>
                    <p className="text-xs text-gray-500">Comunicação preferida</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500">{activeConversation.numero_cliente || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Automations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Automações</h4>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-red-700">Pausada Indefinidamente</span>
                  </div>
                </div>
              </div>

              {/* Contact Tags */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Tags do contato</h4>
                  <button className="text-blue-500 text-sm hover:text-blue-600">+ Adicionar Tag</button>
                </div>
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhuma tag adicionada
                </div>
              </div>

              {/* Sequences */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Inscrito nas Sequências</h4>
                  <button className="text-blue-500 text-sm hover:text-blue-600">Assinar</button>
                </div>
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhuma sequência ativa
                </div>
              </div>

              {/* Opted to join */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Optou por aderir</h4>
                <button className="w-full px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-200 transition-colors">
                  Mensagem Privada
                </button>
              </div>

              {/* System Fields */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Campos do Sistema</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-xs text-gray-500">Primeiro Nome</label>
                    <p className="text-sm font-medium text-gray-900">{activeConversation.nome_cliente || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-xs text-gray-500">Sobrenome</label>
                    <p className="text-sm font-medium text-gray-900">| Sociedade Avançada</p>
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Campos Personalizados</h4>
                  <button className="text-blue-500 text-sm hover:text-blue-600">Gerenciar Campos Personalizados</button>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-xs text-gray-500">GPT_THREAD</label>
                    <p className="text-sm font-medium text-gray-900">thread_FrJkCutclxvhZdsXDyuGOHdz</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-xs text-gray-500">GUIBBSGPT_ENTRADA</label>
                    <p className="text-sm font-medium text-gray-900 text-gray-400">Vazio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Para ver os detalhes do contato</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
