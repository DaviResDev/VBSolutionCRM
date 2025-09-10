import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnections } from "@/contexts/ConnectionsContext";
import {
  Settings, User, Send, Mic,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ConnectionStatusBadge from "@/components/ConnectionStatusBadge";
import WhatsAppChatList from "@/components/WhatsAppChatList";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { useMessages } from "@/hooks/useMessages";
import { waSdk } from "@/lib/waSdk";
import TemplateManager from "@/components/TemplateManager";

// ===== helpers (kept) =======================================================
function getRelativeTime(date: string) {
  const now = new Date();
  const messageTime = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInMinutes < 1) return "Agora";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  return messageTime.toLocaleDateString();
}
function BubbleContent({ message }: { message: any }) {
  if (message.tipo === "TEXTO" || message.type === "text") {
    return <span className="whitespace-pre-wrap">{message.conteudo ?? message.text}</span>;
  }
  if (message.tipo === "IMAGEM" || message.type === "image") {
    return (
      <div className="space-y-2">
        {message.midia_url && <img src={message.midia_url} alt="Imagem" className="max-w-xs rounded-lg" />}
        {message.conteudo && <span className="whitespace-pre-wrap">{message.conteudo}</span>}
      </div>
    );
  }
  if (message.tipo === "AUDIO" || message.type === "audio") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-500 rounded-full" />
        <span>Áudio</span>
      </div>
    );
  }
  return <span>Mensagem {message.tipo ?? message.type}</span>;
}
// ===========================================================================

export default function WhatsAppPage() {
  const { activeConnection } = useConnections();
  const navigate = useNavigate();
  const [active, setActive] = useState<{ connectionId: string; chatId: string; atendimentoId: string } | null>(null);
  const [activeTab, setActiveTab] = useState("conversations");

  // messaging hook wired with correct IDs
  const canLoad = Boolean(active?.connectionId && active?.chatId);
  const { messages, loading, hasMoreOlder, isFetchingOlder, fetchOlder, addOptimistic } = useMessages({
    connectionId: active?.connectionId ?? "",
    chatId: active?.chatId ?? "",
    atendimentoId: active?.atendimentoId ?? "",
  }, { enabled: canLoad });

  // Debug log
  useEffect(() => {
    console.log("[useMessages] with", active);
  }, [active]);

  // scroll elements
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // audio (stub remains; pipeline comes next)
  const { recording: isRecording, start: startRecording, stop: stopRecording } = useAudioRecorder();

  // first render → stick to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Simplified scroll handling
  const stickBottomIfNear = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (near) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    stickBottomIfNear();
  }, [messages, stickBottomIfNear]);

  async function handleSendMessage(text: string) {
    if (!text.trim() || !active?.connectionId || !active.chatId) return;

    // optimistic bubble (Portuguese schema compatibility)
    const clientId = await addOptimistic({
      atendimento_id: active.atendimentoId,
      connection_id: active.connectionId,
      chat_id: active.chatId,
      remetente: "ATENDENTE",
      tipo: "TEXTO",
      conteudo: text.trim(),
      direction: "out",
      type: "text",
      text: text.trim(),
    });

    try {
      await waSdk.sendMessage(
        {
          connectionId: active.connectionId,
          chatId: active.chatId,
          type: "text",
          text,
        },
        { idempotencyKey: clientId }
      );
    } catch (e) {
      console.error(e);
      toast({ title: "Falha ao enviar", description: "Tente novamente", variant: "destructive" });
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <ConnectionStatusBadge />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configurações
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-4 bg-gray-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="h-full">
            <div className="h-full flex flex-col">
              {/* Chat Section - Full Height */}
              <div className="grid grid-cols-[320px_1fr_360px] gap-4 flex-1 min-h-[calc(100vh-300px)]">
              {/* Left: list */}
              <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 font-medium border-b">Conversas</div>
                <WhatsAppChatList
                  active={active}
                  onSelect={setActive}
                  ownerId="f8451154-cea5-43a3-8f75-d64c07056e04"
                />
              </div>

              {/* Middle: chat + dashboard under */}
              <div className="bg-white rounded-2xl border overflow-hidden flex flex-col min-h-0">
                {active ? (
                  <>
                    {/* Chat header */}
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${active.chatId}`} />
                          <AvatarFallback>{active.chatId.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{active.chatId}</div>
                          <div className="text-xs text-gray-500">{activeConnection?.status === "connected" ? "Online" : "Offline"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <User className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div ref={topSentinelRef} className="h-1 w-full" />
                      {loading && <div className="text-center text-gray-500">Carregando mensagens...</div>}
                      {!loading && messages.length === 0 && (
                        <div className="text-center text-gray-500">Nenhuma mensagem nesta conversa.</div>
                      )}
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.remetente === "ATENDENTE" || message.direction === "out" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.remetente === "ATENDENTE" || message.direction === "out"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            <BubbleContent message={message} />
                            <div className="text-right text-xs opacity-75 mt-1">
                              {getRelativeTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t bg-white flex items-center gap-2">
                      <Textarea
                        ref={inputRef}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            const v = e.currentTarget.value;
                            e.currentTarget.value = "";
                            handleSendMessage(v);
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          const v = inputRef.current?.value ?? "";
                          if (inputRef.current) inputRef.current.value = "";
                          handleSendMessage(v);
                        }}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={isRecording ? stopRecording : startRecording}>
                        <Mic className={`h-5 w-5 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
                      </Button>
                    </div>

                  </>
                ) : (
                  <div className="h-full grid place-items-center text-center text-sm text-gray-500">
                    <div>
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 grid place-items-center">💬</div>
                      <div className="font-medium">Selecione uma conversa</div>
                      <div>Escolha uma conversa para começar a enviar mensagens</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: details */}
              <div className="bg-white rounded-2xl border overflow-hidden">
                {active ? (
                  <div className="p-4">
                    <h3 className="font-medium mb-2">Detalhes do Contato</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Chat ID:</strong> {active.chatId}
                      </div>
                      <div>
                        <strong>Atendimento ID:</strong> {active.atendimentoId}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full grid place-items-center text-sm text-gray-400">
                    <div className="text-center">
                      <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <div>Selecione uma conversa para ver os detalhes do contato</div>
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Dashboard Section - Below Conversations */}
              <div className="mt-4 bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-lg mb-4">Dashboard WhatsApp</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-sm text-gray-600">Conversas Ativas</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">48</div>
                    <div className="text-sm text-gray-600">Mensagens Hoje</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-sm text-gray-600">Não Lidas</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">2.4m</div>
                    <div className="text-sm text-gray-600">Tempo Médio</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="h-full">
            <TemplateManager 
              onTemplateUse={(template) => {
                // Quando um template for usado, podemos integrar com o chat
                console.log("Template usado:", template);
                toast({
                  title: "Template aplicado",
                  description: `Template "${template.name}" foi aplicado ao chat`
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}