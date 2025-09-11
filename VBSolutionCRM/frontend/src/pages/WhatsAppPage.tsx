import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, Send, Loader2, Clock, Phone, Settings, MoreVertical, User, Tag, CheckCircle, AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';

const OWNER_ID = '95d595b4-3fad-4025-b76e-a54b69c84d2b'; // Owner ID real do Supabase

// Utility function for message previews
function labelPreview(tipo, conteudo, duration_ms) {
  const t = String(tipo || "").toUpperCase();
  switch (t) {
    case "TEXTO":
      return (conteudo || "").slice(0, 120);
    case "IMAGEM":
      return `🖼️ Foto${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "VIDEO":
      return `🎬 Vídeo${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "AUDIO":
      return `🎧 Áudio${duration_ms ? " (" + Math.round(duration_ms/1000) + "s)" : ""}`;
    case "STICKER":
      return "💟 Figurinha";
    case "ARQUIVO":
      return `📎 Arquivo${conteudo ? ": " + conteudo.slice(0,80) : ""}`;
    case "LOCALIZACAO":
      return "📍 Localização";
    default:
      return "Mensagem";
  }
}

// -------- Mock data helpers (kept local so this page is fully visualizable) ----------
const MOCK_CONTACTS = {
  'conv-1': { name: 'João Silva', phone: '5511999999999', email: 'joao@cliente.com', tags: ['VIP', 'Novo'], status: 'Ativo' },
  'conv-2': { name: 'Maria Santos', phone: '5511888888888', email: 'maria@cliente.com', tags: ['Lead'], status: 'Ativo' },
  'conv-3': { name: 'Carlos Oliveira', phone: '5511777777777', email: 'carlos@cliente.com', tags: ['Suporte'], status: 'Pendente' },
  'conv-4': { name: 'Ana Costa', phone: '5511666666666', email: 'ana@cliente.com', tags: [], status: 'Ativo' },
  'conv-5': { name: null, phone: '5511555555555', email: null, tags: ['WhatsApp'], status: 'Ativo' }
};

const MOCK_TEMPLATES = [
  { id: 't1', name: 'Boas-vindas', body: 'Olá {{nome}}, obrigado por entrar em contato! Como posso ajudar?' },
  { id: 't2', name: 'Status do Pedido', body: 'Olá {{nome}}, seu pedido #{{pedido}} está com status: {{status}}.' },
  { id: 't3', name: 'Feedback', body: 'Olá {{nome}}, sua experiência foi satisfatória? Sua opinião é muito importante.' },
];

// --------- Left Pane (Conversations List) ----------
const ConversationsList = ({ onConversationSelect, selectedConversationId }) => {
  const { activeConnection } = useConnections();
  const { conversations, loading, loadConversations, markAsRead } = useWhatsAppConversations(
    activeConnection?.id,
    OWNER_ID
  );
  const [q, setQ] = useState('');

  useEffect(() => { 
    if (activeConnection?.id) loadConversations(); 
  }, [activeConnection?.id, loadConversations]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter(c =>
      (c.nome_cliente || '').toLowerCase().includes(s) ||
      (c.numero_cliente || '').toLowerCase().includes(s) ||
      (c.lastMessage?.conteudo || '').toLowerCase().includes(s)
    );
  }, [conversations, q]);

  const handleConversationClick = (conversationId) => {
    markAsRead(conversationId);
    onConversationSelect(conversationId);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    if (diffHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">Carregando conversas...</p>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
        <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm text-center mb-2">Nenhuma conversa encontrada</p>
        <p className="text-xs text-center text-gray-400 mb-3">As conversas aparecerão aqui quando chegarem mensagens</p>
        <button onClick={loadConversations} className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Conversas ({filtered.length})</span>
          <button onClick={loadConversations} className="text-xs text-green-600 hover:text-green-700 font-medium">Atualizar</button>
        </div>
        <div className="mt-2 relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, número ou mensagem..."
            className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0">
          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors border-b border-gray-100 hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-medium">
                  {(conversation.nome_cliente || conversation.numero_cliente).charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.nome_cliente || conversation.numero_cliente}
                  </h3>
                  <div className="flex items-center space-x-2 ml-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(conversation.lastMessageAt)}
                    </div>
                    {conversation.unread > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-full min-w-[20px]">
                        {conversation.unread > 99 ? '99+' : conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage?.conteudo || 'Nenhuma mensagem'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --------- Center: Chat Area ----------
const ChatArea = ({ conversationId, onInsertTemplate }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (conversationId) {
      const mockConversationDetails = {
        'conv-1': { name: 'João Silva', phone: '5511999999999' },
        'conv-2': { name: 'Maria Santos', phone: '5511888888888' },
        'conv-3': { name: 'Carlos Oliveira', phone: '5511777777777' },
        'conv-4': { name: 'Ana Costa', phone: '5511666666666' },
        'conv-5': { name: '5511555555555', phone: '5511555555555' }
      };
      const mockMessages = {
        'conv-1': [
          { id: 1, content: 'Oi, como você está?', sender: 'client', timestamp: new Date(Date.now() - 300000).toISOString() },
          { id: 2, content: 'Preciso de ajuda com meu pedido', sender: 'client', timestamp: new Date(Date.now() - 180000).toISOString() },
          { id: 3, content: 'Olá! Claro, vou te ajudar. Qual é o número do seu pedido?', sender: 'agent', timestamp: new Date(Date.now() - 120000).toISOString() },
          { id: 4, content: 'É o pedido #12345', sender: 'client', timestamp: new Date(Date.now() - 60000).toISOString() }
        ],
        'conv-2': [
          { id: 1, content: 'Tenho uma dúvida sobre o produto', sender: 'client', timestamp: new Date(Date.now() - 1800000).toISOString() },
          { id: 2, content: 'Claro! Qual é sua dúvida?', sender: 'agent', timestamp: new Date(Date.now() - 1680000).toISOString() },
          { id: 3, content: 'Obrigado pela ajuda! Muito esclarecedor.', sender: 'client', timestamp: new Date(Date.now() - 1620000).toISOString() }
        ]
      };
      setSelectedConversation(mockConversationDetails[conversationId]);
      setMessages(mockMessages[conversationId] || []);
    }
  }, [conversationId]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newMessage = { id: Date.now(), content: message, sender: 'agent', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    console.log('Sending message:', message, 'to conversation:', conversationId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Allow "insert template" from the right panel
  useEffect(() => {
    if (!onInsertTemplate) return;
    const unsub = onInsertTemplate.subscribe?.((text) => {
      setMessage((m) => (m ? m + ' ' : '') + text);
    });
    return () => unsub?.();
  }, [onInsertTemplate]);

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50">
        <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-sm text-center text-gray-400">Escolha uma conversa da lista para começar a enviar mensagens</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-medium">
                {selectedConversation?.name?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{selectedConversation?.name || 'Cliente'}</h3>
              <p className="text-sm text-gray-500">{selectedConversation?.phone}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma mensagem ainda. Seja o primeiro a enviar uma mensagem!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender === 'agent' ? 'bg-green-500 text-white' : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'agent' ? 'text-green-100' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --------- Right Panel (Details & Templates) ----------
function createSimpleBus() {
  // tiny event bus for template -> chat insertion
  const listeners = new Set();
  return {
    emit: (text) => listeners.forEach((fn) => fn(text)),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

const DetailsPanel = ({ conversationId, onInsertTemplate }) => {
  const [tab, setTab] = useState<'details' | 'templates'>('details');

  const contact = useMemo(() => MOCK_CONTACTS[conversationId] || null, [conversationId]);

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Selecione uma conversa
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Informações</h3>
            <p className="text-xs text-gray-500">Detalhes e modelos rápidos</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={`px-2 py-1 text-xs rounded ${tab==='details'?'bg-green-600 text-white':'bg-white border'}`} onClick={()=>setTab('details')}>Detalhes</button>
            <button className={`px-2 py-1 text-xs rounded ${tab==='templates'?'bg-green-600 text-white':'bg-white border'}`} onClick={()=>setTab('templates')}>Templates</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'details' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{contact?.name || 'Contato sem nome'}</div>
                <div className="text-sm text-gray-500">{contact?.phone}</div>
                {contact?.email && <div className="text-xs text-gray-400">{contact.email}</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {(contact?.tags || []).length ? contact.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                    <Tag className="w-3 h-3" /> {t}
                  </span>
                )) : <span className="text-xs text-gray-400">Sem tags</span>}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
              <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle className="w-3 h-3" /> {contact?.status || 'Desconhecido'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="text-xs px-2 py-2 rounded border hover:bg-gray-50">Encerrar</button>
              <button className="text-xs px-2 py-2 rounded border hover:bg-gray-50">Transferir</button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Evite dados sensíveis no chat.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_TEMPLATES.map(t => (
              <div key={t.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{t.name}</div>
                  <button
                    onClick={() => onInsertTemplate.emit(t.body.replace('{{nome}}','Cliente').replace('{{pedido}}','12345').replace('{{status}}','Enviado'))}
                    className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Inserir
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1">{t.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --------- Page wrapper ----------
export default function WhatsAppPage() {
  const { activeConnection } = useConnections();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // tiny event bus to insert templates into ChatArea input
  const insertBus = useMemo(() => createSimpleBus(), []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex h-full bg-white shadow-lg">
        {/* Left Panel - Conversations List */}
        <div className="w-[28%] min-w-[300px] border-r border-gray-200 flex flex-col">
          <div className="p-4 bg-green-600 text-white">
            <h1 className="text-lg font-semibold">WhatsApp</h1>
            <p className="text-sm opacity-90">
              {activeConnection?.session_name || 'Nenhuma conexão'} — {activeConnection?.status === 'connected' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
          <ConversationsList
            onConversationSelect={setSelectedConversationId}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Center - Chat Area */}
        <div className="flex-1 border-r border-gray-200">
          <ChatArea conversationId={selectedConversationId} onInsertTemplate={insertBus} />
        </div>

        {/* Right Panel - Details & Templates */}
        <div className="w-[26%] min-w-[320px]">
          <DetailsPanel conversationId={selectedConversationId} onInsertTemplate={insertBus} />
        </div>
      </div>
    </div>
  );
}