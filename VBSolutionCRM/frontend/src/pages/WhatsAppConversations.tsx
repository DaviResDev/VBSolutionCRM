"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { 
  listConversations, 
  getMessages
} from "@/lib/waSdk";
import { useChatSocket } from "@/lib/useChatSocket";
import { useConnections } from "@/contexts/ConnectionsContext";
import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";

export default function WhatsAppConversations() {
  const { activeConnection } = useConnections();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{id: string; toJid: string; contactId: string;}|null>(null);
  const [typingState, setTypingState] = useState<{[key: string]: boolean}>({});
  const [messages, setMessages] = useState<any[]>([]);
  const qc = useQueryClient();

  // Usar hook personalizado para conversas do Supabase
  const {
    conversations,
    loading: conversationsLoading,
    loadMessages,
    markAsRead,
    sendMessage
  } = useWhatsAppConversations(
    activeConnection?.id,
    "00000000-0000-0000-0000-000000000000" // Owner ID fixo por enquanto
  );

  // Carregar mensagens quando uma conversa for selecionada
  useEffect(() => {
    if (selected?.id) {
      loadMessages(selected.id).then(setMessages);
      markAsRead(selected.id);
    }
  }, [selected?.id, loadMessages, markAsRead]);

  // Contact + custom fields (right panel) - simplified
  const contactQ = { data: null };
  const fieldsQ = { data: { items: [] } };

  // Socket live updates
  useChatSocket({
    tenantId, 
    connectionId, 
    conversationId: selected?.id,
    onMessage: (m) => {
      if (m.conversationId === selected?.id) {
        qc.setQueryData<any>(["wa","msgs", selected?.id], (old) => {
          if (!old) return { items:[m] };
          return { ...old, items:[...old.items, m] };
        });
      }
      qc.invalidateQueries({ queryKey:["wa","convs", connectionId] });
    },
    onTyping: (t) => { 
      if (t.conversationId === selected?.id) {
        setTypingState(prev => ({ ...prev, [t.from]: t.state === 'composing' }));
        if (t.state === 'composing') {
          setTimeout(() => {
            setTypingState(prev => ({ ...prev, [t.from]: false }));
          }, 3000);
        }
      }
    },
    onStatus: (s) => { 
      console.log('Connection status:', s);
    }
  });

  async function handleSend(text: string) {
    if (!selected) return;
    try {
      const newMessage = await sendMessage(selected.id, text);
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  }

  function onFocusConversation() {
    console.log("Focusing conversation:", selected);
    // TODO: Implement mark as read
  }

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!search) return conversations;
    
    return conversations.filter((cv: any) => 
      cv.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
      cv.numero_cliente?.includes(search) ||
      cv.lastMessage?.conteudo?.toLowerCase().includes(search.toLowerCase())
    );
  }, [conversations, search]);

  if (!activeConnection) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma conexão ativa</h2>
          <p className="text-gray-500">Selecione uma conexão WhatsApp para começar a conversar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[360px_1fr_360px] h-[calc(100vh-100px)] gap-4 p-4">
      {/* LEFT */}
      <div className="rounded-xl bg-white border">
        <div className="p-3 border-b">
          <input 
            className="w-full rounded-md border px-3 py-2 text-sm" 
            placeholder="Buscar conversas..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
          />
        </div>
        <div className="overflow-auto h-[calc(100%-56px)]">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhuma conversa encontrada</div>
          ) : (
            filteredConversations.map((cv: any) => (
              <button 
                key={cv.id} 
                onClick={() => { 
                  setSelected({ id: cv.id, toJid: cv.chat_id, contactId: cv.numero_cliente }); 
                  onFocusConversation(); 
                }}
                className={`w-full text-left px-3 py-2 flex gap-3 hover:bg-zinc-50 ${
                  selected?.id === cv.id ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{cv.nome_cliente || cv.numero_cliente}</div>
                  <div className="text-xs text-zinc-500 truncate">{cv.lastMessage?.conteudo || ''}</div>
                </div>
                {cv.unread > 0 && (
                  <span className="text-xs bg-emerald-600 text-white rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                    {cv.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER */}
      <div className="rounded-xl bg-white border flex flex-col">
        <Header selected={selected} connection={activeConnection} />
        <Thread msgs={messages} typingState={typingState} />
        <Composer 
          onTyping={(state) => console.log("Typing:", state)} 
          onSend={handleSend}
        />
      </div>

      {/* RIGHT */}
      <div className="rounded-xl bg-white border p-4">
        <ContactPanel 
          contact={contactQ.data} 
          fields={fieldsQ.data?.items || []}
          onSaveFields={vals => console.log("Saving fields:", vals)}
        />
      </div>
    </div>
  );
}

// --- Components below
function Header({ selected, connection }: { selected: any; connection: any }) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {connection?.name?.charAt(0) || 'W'}
          </span>
        </div>
        <div>
          <div className="font-medium text-sm">
            {selected ? (selected.contactId || 'Conversa') : 'Selecione uma conversa'}
          </div>
          <div className="text-xs text-gray-500">
            {connection?.status === 'connected' ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connection?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-500">
          {connection?.status === 'connected' ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

function Thread({ msgs, typingState }: { msgs: any[]; typingState: {[key: string]: boolean} }) {
  return (
    <div className="flex-1 overflow-auto px-4 py-3 space-y-2 bg-zinc-50">
      {msgs.map(m => (
        <div 
          key={m.id} 
          className={`max-w-[70%] rounded-2xl px-3 py-2 ${
            m.remetente === 'OPERADOR' || m.remetente === 'AI'
              ? 'ml-auto bg-emerald-600 text-white' 
              : 'bg-white border'
          }`}
        >
          <div className="text-sm">
            {m.tipo === 'TEXTO' ? m.conteudo : <span>Mídia ({m.tipo})</span>}
          </div>
          <div className={`text-xs mt-1 ${
            m.remetente === 'OPERADOR' || m.remetente === 'AI' ? 'text-emerald-100' : 'text-gray-500'
          }`}>
            {dayjs(m.timestamp).format('HH:mm')}
            {(m.remetente === 'OPERADOR' || m.remetente === 'AI') && (
              <span className="ml-1">
                {m.lida ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      ))}
      
      {/* Typing indicator */}
      {Object.values(typingState).some(typing => typing) && (
        <div className="bg-white border rounded-2xl px-3 py-2 max-w-[70%]">
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span className="text-xs text-gray-500 ml-2">digitando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({ onTyping, onSend }: { 
  onTyping: (s: 'composing' | 'paused') => void; 
  onSend: (t: string) => void; 
}) {
  const [val, setVal] = useState('');

  return (
    <div className="border-t p-3 flex gap-2 items-center">
      <input 
        value={val} 
        onChange={e => { 
          setVal(e.target.value); 
          onTyping('composing'); 
        }}
        onBlur={() => onTyping('paused')}
        onKeyDown={(e) => { 
          if (e.key === 'Enter' && val.trim()) { 
            onSend(val.trim()); 
            setVal(''); 
          } 
        }}
        className="flex-1 rounded-md border px-3 py-2 text-sm" 
        placeholder="Escreva uma mensagem..." 
      />
      <button 
        onClick={() => { 
          if (val.trim()) { 
            onSend(val.trim()); 
            setVal(''); 
          } 
        }}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 transition-colors"
      >
        Enviar
      </button>
    </div>
  );
}

function ContactPanel({ contact, fields, onSaveFields }: {
  contact: any; 
  fields: any[]; 
  onSaveFields: (vals: any) => void;
}) {
  const [draft, setDraft] = useState<Record<string, any>>({});

  if (!contact) {
    return (
      <div className="text-sm text-zinc-500 text-center">
        Selecione uma conversa para ver os detalhes do contato
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-xl font-semibold">
            {contact.name?.charAt(0) || contact.phoneE164?.charAt(0) || 'C'}
          </span>
        </div>
        <div className="text-sm font-medium">{contact.name || contact.phoneE164}</div>
        <div className="text-xs text-zinc-500">{contact.jid}</div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Campos Personalizados</div>
        <div className="space-y-2">
          {fields.map((f: any) => (
            <div key={f.id} className="text-sm">
              <label className="text-xs text-zinc-500 block mb-1">{f.label}</label>
              <input 
                defaultValue={contact.customFields?.[f.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                className="w-full rounded-md border px-2 py-1 text-sm"
                placeholder={`Digite ${f.label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
        <div className="pt-2">
          <button 
            onClick={() => onSaveFields(draft)} 
            className="rounded-md bg-zinc-900 text-white px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}