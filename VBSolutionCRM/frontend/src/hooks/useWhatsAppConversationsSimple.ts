"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nrbsocawokmihvxfcpso.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnNvY2F3b2ttaWh2eGZjcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQwNTMsImV4cCI6MjA3MjA1MDA1M30.3SxEVRNNBHhAXgJ7S2BMHm1QWq9kxYamuLjvZm0_OU0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Socket / API base
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || "http://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL?.trim() || SOCKET_URL;

/* ============================
   Types
============================ */
export type WhatsAppMessage = {
  id?: string;
  message_id?: string;
  owner_id?: string;
  connection_id?: string;
  connection_phone?: string;
  chat_id: string;
  phone_number?: string;
  conteudo?: string;
  message_type?: string;
  media_type?: string;
  media_url?: string;
  media_mime?: string;
  duration_ms?: number;
  remetente?: "CLIENTE" | "OPERADOR" | "AI";
  status?: string;
  lida?: boolean;
  timestamp: string | Date;
};

export type Conversation = {
  id: string;
  owner_id?: string;
  connection_id?: string;
  connection_phone?: string;
  chat_id: string;
  nome_cliente: string;
  numero_cliente: string;
  status?: string;
  lastMessageAt?: string;
  lastMessage?: WhatsAppMessage | null;
  unread: number;
  total_messages?: number;
  messages?: WhatsAppMessage[];
};

type HookReturn = {
  conversations: Conversation[];
  messages: WhatsAppMessage[];
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;
  loading: boolean;
  error: string | null;
  connected: boolean;
  connectSocket: (ownerId: string) => void;
  disconnectSocket: () => void;
  loadConversations: (ownerId: string) => Promise<void>;
  loadMessages: (chatId: string, ownerId: string) => Promise<void>;
  joinConversation: (chatId: string) => void;
  leaveConversation: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
  sendMessage: (text: string, type?: "TEXTO" | string, extra?: Record<string, any>) => Promise<void>;
};

/* ============================
   Hook
============================ */
export function useWhatsAppConversationsSimple(): HookReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef<string | null>(null);

  /* ---------- Socket ---------- */
  const connectSocket = useCallback((ownerId: string) => {
    if (socketRef.current) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
      auth: { ownerId },
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("conversation:updated", (payload: any) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.chat_id === payload.conversationId || c.chat_id === payload.chat_id);
        if (idx === -1) return prev;
        const copy = prev.slice();
        const target = copy[idx];

        copy[idx] = {
          ...target,
          lastMessageAt: payload.lastMessageAt || payload.last_message?.timestamp || target.lastMessageAt,
          lastMessage: payload.last_message || target.lastMessage,
          unread: typeof payload.unread_count === "number" ? payload.unread_count : typeof payload.unread === "number" ? payload.unread : target.unread,
        };
        return copy;
      });
    });

    s.on("newMessage", (m: WhatsAppMessage) => {
      if (activeConversation?.chat_id && m.chat_id === activeConversation.chat_id) {
        setMessages(prev => [...prev, m]);
      }
      setConversations(prev =>
        prev.map(c =>
          c.chat_id === m.chat_id
            ? {
                ...c,
                lastMessage: m,
                lastMessageAt: String(m.timestamp),
                unread: m.remetente === "CLIENTE" && !m.lida ? (Number(c.unread) || 0) + 1 : c.unread,
              }
            : c
        )
      );
    });

    socketRef.current = s;
  }, [activeConversation?.chat_id]);

  const disconnectSocket = useCallback(() => {
    try {
      socketRef.current?.disconnect();
    } finally {
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const joinConversation = useCallback((chatId: string) => {
    if (!socketRef.current) return;
    const room = `default-${chatId}`;
    if (joinedRoomRef.current === room) return;

    if (joinedRoomRef.current) {
      socketRef.current.emit("leave", { room: joinedRoomRef.current });
    }

    socketRef.current.emit("join", {
      connectionId: "default",
      conversationId: chatId,
    });

    joinedRoomRef.current = room;
  }, []);

  const leaveConversation = useCallback((chatId: string) => {
    if (!socketRef.current) return;
    const room = `default-${chatId}`;
    socketRef.current.emit("leave", { room });
    if (joinedRoomRef.current === room) {
      joinedRoomRef.current = null;
    }
  }, []);

  /* ---------- Data loaders ---------- */
  const loadConversations = useCallback(async (ownerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: err } = await supabase
        .from("whatsapp_mensagens")
        .select("*")
        .eq("owner_id", ownerId)
        .order("timestamp", { ascending: true });

      if (err) throw err;

      // Group by chat_id → build conversation previews
      const map = new Map<string, any>();
      for (const r of rows || []) {
        const key = r.chat_id;
        const current = map.get(key);
        if (!current) {
          map.set(key, {
            chat_id: r.chat_id,
            owner_id: r.owner_id,
            connection_id: r.connection_id,
            connection_phone: r.connection_phone,
            numero_cliente: r.phone_number || r.chat_id?.split("@")[0] || "",
            nome_cliente: r.nome_cliente || "",
            status: r.status,
            last_message: r,
            lastMessageAt: String(r.timestamp),
            unread_count: (!r.lida && r.remetente === "CLIENTE") ? 1 : 0,
            total_messages: 1,
          });
        } else {
          const lastTs = new Date(current.lastMessageAt || 0).getTime();
          const rowTs = new Date(r.timestamp as any).getTime();
          if (rowTs >= lastTs) {
            current.last_message = r;
            current.lastMessageAt = String(r.timestamp);
          }
          current.total_messages = (current.total_messages || 0) + 1;
          if (!r.lida && r.remetente === "CLIENTE") {
            current.unread_count = (current.unread_count || 0) + 1;
          }
        }
      }

      const list = Array.from(map.values()).map((raw: any) => ({
        id: raw.id ?? raw.chat_id,
        owner_id: raw.owner_id,
        connection_id: raw.connection_id,
        connection_phone: raw.connection_phone,
        chat_id: raw.chat_id,
        nome_cliente: raw.nome_cliente || raw.numero_cliente || "Contato",
        numero_cliente: raw.numero_cliente,
        status: raw.status,
        lastMessageAt: raw.lastMessageAt,
        lastMessage: raw.last_message || null,
        unread: typeof raw.unread_count === "number" ? raw.unread_count : 0,
        total_messages: raw.total_messages,
        messages: raw.messages || [],
      }));

      list.sort((a, b) => {
        const A = new Date(a.lastMessageAt || 0).getTime();
        const B = new Date(b.lastMessageAt || 0).getTime();
        return B - A;
      });

      setConversations(list);
    } catch (e: any) {
      console.error("[loadConversations] error:", e);
      setError(e?.message || "Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string, ownerId: string) => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("whatsapp_mensagens")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("chat_id", chatId)
        .order("timestamp", { ascending: true });

      if (err) throw err;

      setMessages(data || []);
    } catch (e: any) {
      console.error("[loadMessages] error:", e);
      setError(e?.message || "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- Actions ---------- */
  const markAsRead = useCallback((chatId: string) => {
    try {
      socketRef.current?.emit("conversation:markAsRead", {
        connectionId: "default",
        conversationId: chatId,
      });

      setConversations(prev =>
        prev.map(c => (c.chat_id === chatId ? { ...c, unread: 0 } : c))
      );
    } catch (e) {
      // no-op
    }
  }, []);

  const sendMessage = useCallback(async (text: string, type: "TEXTO" | string = "TEXTO", extra: Record<string, any> = {}) => {
    if (!activeConversation?.chat_id) return;

    const now = new Date().toISOString();
    const optimistic: WhatsAppMessage = {
      id: `opt-${Date.now()}`,
      chat_id: activeConversation.chat_id,
      owner_id: activeConversation.owner_id,
      connection_id: activeConversation.connection_id,
      conteudo: text,
      message_type: type,
      remetente: "OPERADOR",
      lida: true,
      timestamp: now,
    };

    setMessages(prev => [...prev, optimistic]);
    setConversations(prev =>
      prev.map(c =>
        c.chat_id === activeConversation.chat_id
          ? { ...c, lastMessage: optimistic, lastMessageAt: now }
          : c
      )
    );

    await supabase.from("whatsapp_mensagens").insert({
      owner_id: activeConversation.owner_id,
      connection_id: "default",
      chat_id: activeConversation.chat_id,
      phone_number: activeConversation.numero_cliente,
      connection_phone: activeConversation.connection_phone,
      conteudo: text,
      message_type: type,
      remetente: "OPERADOR",
      lida: true,
      timestamp: now,
      ...extra,
    });
  }, [activeConversation]);

  /* ---------- Memo ---------- */
  const value = useMemo(
    () => ({
      conversations,
      messages,
      activeConversation,
      setActiveConversation,
      loading,
      error,
      connected,
      connectSocket,
      disconnectSocket,
      loadConversations,
      loadMessages,
      joinConversation,
      leaveConversation,
      markAsRead,
      sendMessage,
    }),
    [
      conversations,
      messages,
      activeConversation,
      loading,
      error,
      connected,
      connectSocket,
      disconnectSocket,
      loadConversations,
      loadMessages,
      joinConversation,
      leaveConversation,
      markAsRead,
      sendMessage,
    ]
  );

  return value;
}
