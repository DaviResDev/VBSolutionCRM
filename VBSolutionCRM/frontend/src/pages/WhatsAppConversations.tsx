"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useWhatsAppConversations, WhatsAppMessage } from "@/hooks/useWhatsAppConversations";
import { MessageCircle } from "lucide-react";

const OWNER_ID = "95d595b4-3fad-4025-b76e-a54b69c84d2b";

// Preview generator
function getMessagePreview(message?: WhatsAppMessage): string {
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

export default function WhatsAppConversations() {
  const { activeConnection } = useConnections();
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    loading,
    error,
    connectSocket,
    disconnectSocket,
    loadConversations,
    loadMessages,
    joinConversation,
    sendMessage,
    markAsRead,
  } = useWhatsAppConversations();

  const [search, setSearch] = useState("");
  const [text, setText] = useState("");

  // connect socket once
  useEffect(() => {
    connectSocket(OWNER_ID);
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  // load conversations on connection change
  useEffect(() => {
    if (activeConnection?.id) {
      loadConversations(OWNER_ID);
    }
  }, [activeConnection?.id, loadConversations]);

  // search filter
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

  // select conversation
  const selectConversation = useCallback(async (chatId: string) => {
    const conv = conversations.find(c => c.chat_id === chatId);
    if (!conv) return;
    setActiveConversation({ ...conv, owner_id: OWNER_ID } as any);
    joinConversation(chatId);
    await loadMessages(chatId, OWNER_ID);
    markAsRead(chatId);
  }, [conversations, setActiveConversation, joinConversation, loadMessages, markAsRead]);

  // send message
  const handleSend = useCallback(async () => {
    if (!text.trim() || !activeConversation?.chat_id) return;
    await sendMessage(text.trim());
    setText("");
    // reload history
    await loadMessages(activeConversation.chat_id, OWNER_ID);
  }, [text, activeConversation?.chat_id, sendMessage, loadMessages]);

  // helpers
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

  if (!activeConnection) {
    return <div className="flex items-center justify-center h-full">Nenhuma conexão ativa</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600">
        Erro ao carregar conversas: {error}
        <button onClick={() => loadConversations(OWNER_ID)}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Left column - conversation list */}
      <div className="w-2/5 border-r flex flex-col h-screen">
        <div className="p-4 border-b flex-shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-4 text-center">Carregando...</div> :
           filtered.length === 0 ? <div className="p-4 text-center">Nenhuma conversa</div> :
           filtered.map(conv => (
             <div
               key={conv.chat_id}
               onClick={() => selectConversation(conv.chat_id)}
               className={`p-3 border-b cursor-pointer ${activeConversation?.chat_id === conv.chat_id ? "bg-blue-50" : ""}`}
             >
               <div className="flex justify-between">
                 <span className="font-medium">{conv.nome_cliente || conv.numero_cliente}</span>
                 <span className="text-xs text-gray-500">{formatTimestamp(conv.lastMessageAt)}</span>
               </div>
               <div className="flex justify-between">
                 <p className="text-xs text-gray-600">{getMessagePreview(conv.lastMessage)}</p>
                 {conv.unread > 0 && (
                   <span className="bg-red-500 text-white rounded-full text-xs px-2">
                     {conv.unread}
                   </span>
                 )}
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* Center - messages */}
      <div className="flex-1 flex flex-col h-screen">
        {activeConversation?.chat_id ? (
          <>
            <div className="p-3 border-b font-medium flex-shrink-0">
              {activeConversation.nome_cliente || activeConversation.numero_cliente}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.remetente === "CLIENTE" ? "justify-start" : "justify-end"}`}>
                  <div className={`px-3 py-2 rounded ${m.remetente === "CLIENTE" ? "bg-white" : "bg-green-500 text-white"}`}>
                    <p className="text-sm">{m.conteudo}</p>
                    <span className="text-[10px] opacity-70">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-white">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escreva uma mensagem..."
                className="flex-1 border px-3 py-2 rounded-full"
              />
              <button onClick={handleSend} className="bg-green-500 text-white px-4 rounded-full">Enviar</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <MessageCircle className="w-10 h-10 mr-2" /> Selecione uma conversa
          </div>
        )}
      </div>

      {/* Right column - contact details */}
      <div className="w-1/3 border-l flex flex-col h-screen">
        <div className="p-4 flex-1 overflow-y-auto">
          {activeConversation ? (
            <>
              <h3 className="font-medium">{activeConversation.nome_cliente || activeConversation.numero_cliente}</h3>
              <p className="text-sm text-gray-500">{activeConversation.chat_id}</p>
            </>
          ) : (
            <p className="text-gray-400">Selecione uma conversa para ver detalhes</p>
          )}
        </div>
      </div>
    </div>
  );
}
