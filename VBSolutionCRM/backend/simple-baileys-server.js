const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
// Importar Baileys dinamicamente
let makeWASocket, DisconnectReason, useMultiFileAuthState, Boom, downloadMediaMessage;
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { mapToDbRow } = require('./message-normalizer');

// Load environment variables
require('dotenv').config({ path: './env.supabase' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://nrbsocawokmihvxfcpso.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnNvY2F3b2ttaWh2eGZjcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQwNTMsImV4cCI6MjA3MjA1MDA1M30.3SxEVRNNBHhAXgJ7S2BMHm1QWq9kxYamuLjvZm0_OU0';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Armazenar conexões ativas
const activeConnections = new Map();

// Media helper functions
function unwrapForDownload(m) {
  if (!m) return {};
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage?.message)  m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
  return m ?? {};
}

function detectMime(msg) {
  const m = unwrapForDownload(msg.message);
  return (
    m?.imageMessage?.mimetype ||
    m?.videoMessage?.mimetype ||
    m?.audioMessage?.mimetype ||
    m?.documentMessage?.mimetype ||
    m?.stickerMessage?.mimetype ||
    'application/octet-stream'
  );
}

async function fetchAndUploadMedia({ supabase, bucket='whatsapp', keyPrefix, msg, logger=console }) {
  if (!downloadMediaMessage) throw new Error('downloadMediaMessage not available yet');
  const unwrapped = { ...msg, message: unwrapForDownload(msg.message) };

  const buffer = await downloadMediaMessage(unwrapped, 'buffer', {}, { logger });
  const mime   = detectMime(msg);
  const ext    = (mime.split('/')[1] || 'bin').split(';')[0];
  const filePath = `${keyPrefix}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket)
    .upload(filePath, buffer, { contentType: mime, upsert: true });
  if (upErr) throw upErr;

  const { data: signed, error: urlErr } = await supabase.storage.from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7d
  if (urlErr) throw urlErr;

  return { url: signed.signedUrl, mime, size: buffer.length, path: filePath };
}

function isMediaTipo(tipo) {
  return ['IMAGEM','VIDEO','AUDIO','STICKER','ARQUIVO'].includes(String(tipo).toUpperCase());
}

// Preview helper for conversation list
function previewLabel(message_type, conteudo, duration_ms) {
  const t = String(message_type || '').toUpperCase();
  switch (t) {
    case 'TEXTO':        return (conteudo || '').slice(0, 120);
    case 'IMAGEM':       return `🖼️ Foto${conteudo ? ': ' + conteudo.slice(0, 80) : ''}`;
    case 'VIDEO':        return `🎬 Vídeo${conteudo ? ': ' + conteudo.slice(0, 80) : ''}`;
    case 'AUDIO':        return `🎧 Áudio${duration_ms ? ' (' + Math.round(duration_ms/1000) + 's)' : ''}`;
    case 'STICKER':      return '💟 Figurinha';
    case 'ARQUIVO':      return `📎 Arquivo${conteudo ? ': ' + conteudo.slice(0, 80) : ''}`;
    case 'LOCALIZACAO':  return '📍 Localização';
    case 'RESPOSTA_BOTAO': return `🔘 ${conteudo || 'Resposta de Botão'}`;
    case 'RESPOSTA_LISTA': return `📋 ${conteudo || 'Resposta de Lista'}`;
    case 'RESPOSTA_TEMPLATE': return `📄 ${conteudo || 'Resposta de Template'}`;
    default:             return conteudo ? conteudo.slice(0, 120) : '[Mensagem]';
  }
}

// Função para salvar/atualizar sessão no Supabase
async function saveSessionToSupabase(connectionId, sessionData, userId = '00000000-0000-0000-0000-000000000000') {
  try {
    // Gerar UUID para o ID da sessão
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    
    // Build payload with user owner_id
    const payload = {
      id: sessionId,
      owner_id: userId, // User ID específico
      session_name: sessionData.name || `Conexão ${connectionId}`,
      status: sessionData.status,
      connection_id: connectionId,
      qr_code: sessionData.qr_code || null,
      connected_at: sessionData.status === 'connected' ? new Date().toISOString() : null,
      disconnected_at: sessionData.status === 'disconnected' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from('whatsapp_sessions')
      .upsert(payload, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Erro ao salvar sessão no Supabase:', error);
    } else {
      console.log(`✅ Sessão salva para usuário ${userId}: ${connectionId}`);
    }
  } catch (error) {
    console.error('Erro ao salvar sessão:', error);
  }
}

// Função para remover sessão do Supabase
async function removeSessionFromSupabase(connectionId) {
  try {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('connection_id', connectionId);
    
    if (error) {
      console.error('Erro ao remover sessão do Supabase:', error);
    }
  } catch (error) {
    console.error('Erro ao remover sessão:', error);
  }
}

// Função para atualizar status de conexão com timestamps corretos
async function updateConnectionStatus(connectionId, status, additionalData = {}, userId = null) {
  try {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    // Adicionar timestamps baseado no status
    if (status === 'connected') {
      // Só definir connected_at se não estiver definido (primeira conexão)
      if (!updateData.connected_at) {
        updateData.connected_at = new Date().toISOString();
      }
      updateData.disconnected_at = null; // Limpar disconnected_at quando conectar
    } else if (status === 'disconnected') {
      updateData.disconnected_at = new Date().toISOString();
      // Não alterar connected_at - manter o valor original
    }

    let query = supabase
      .from('whatsapp_sessions')
      .update(updateData)
      .eq('connection_id', connectionId);
    
    // Se userId for fornecido, filtrar também por owner_id
    if (userId) {
      query = query.eq('owner_id', userId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Erro ao atualizar status da conexão:', error);
    } else {
      console.log(`✅ Status da conexão ${connectionId} atualizado para: ${status}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar status da conexão:', error);
  }
}

// Função para carregar sessões existentes do Supabase
async function loadExistingSessions() {
  try {
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('status', 'connected')
      .not('connection_id', 'is', null);
    
    if (error) {
      console.error('Erro ao carregar sessões:', error);
      return;
    }
    
    console.log(`📋 Carregadas ${sessions?.length || 0} sessões existentes do Supabase`);
    return sessions || [];
  } catch (error) {
    console.error('Erro ao carregar sessões existentes:', error);
    return [];
  }
}

// Função para gerar QR Code real do WhatsApp
async function createWhatsAppConnection(connectionId, userId = '00000000-0000-0000-0000-000000000000') {
  try {
    console.log(`🔗 Criando conexão WhatsApp para: ${connectionId}`);
    
    // Importar Baileys dinamicamente
    if (!makeWASocket) {
      try {
        const baileys = await import('baileys');
        makeWASocket = baileys.default;
        DisconnectReason = baileys.DisconnectReason;
        useMultiFileAuthState = baileys.useMultiFileAuthState;
        downloadMediaMessage = baileys.downloadMediaMessage;
        console.log('✅ Baileys importado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao importar Baileys:', error);
        throw new Error('Falha ao importar Baileys: ' + error.message);
      }
    }
    
    const { Boom } = await import('@hapi/boom');
    
    // Diretório para salvar dados de autenticação
    const authDir = path.join(__dirname, 'auth_info', connectionId);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    // Configurar estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    // Criar socket WhatsApp
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: require('pino')({ level: 'silent' }),
      browser: ['WhatsApp Web', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        return {
          conversation: 'test',
          message: {
            conversation: 'test'
          }
        };
      }
    });
    
    // Evento de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(`📱 QR Code gerado para ${connectionId}`);
        console.log(`QR Code length: ${qr.length}`);
        console.log(`QR Code first 10 chars: ${qr.substring(0, 10)}`);
        console.log(`QR Code last 10 chars: ${qr.substring(qr.length - 10)}`);
        
        // Salvar QR code no Supabase (manter como disconnected até conectar)
        await updateConnectionStatus(connectionId, 'disconnected', {
          qr_code: qr
        }, userId);
        
        // Emitir QR code via Socket.IO
        io.emit('qrCode', { 
          connectionId: connectionId, 
          qrCode: qr 
        });
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 Conexão fechada para ${connectionId}, reconectar: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          // Manter como desconectado e tentar reconectar
          await updateConnectionStatus(connectionId, 'disconnected', {}, userId);
          createWhatsAppConnection(connectionId, userId);
        } else {
          // Marcar como desconectado no Supabase
          console.log(`🗑️ Marcando conexão como desconectada: ${connectionId}`);
          await updateConnectionStatus(connectionId, 'disconnected', {}, userId);
          
          // Remover da memória
          activeConnections.delete(connectionId);
          
          // Emitir evento de remoção para o frontend
          io.emit('connectionRemoved', { connectionId });
        }
      } else if (connection === 'open') {
        console.log(`✅ Conectado ao WhatsApp: ${connectionId}`);
        const connection = activeConnections.get(connectionId);
        if (connection) {
          connection.connectionState = 'connected';
          connection.isConnected = true;
          connection.qrCode = null;
          connection.updatedAt = new Date().toISOString();
        }
        
        // Obter informações do WhatsApp (incluindo número do telefone)
        const whatsappInfo = sock.user;
        const phoneNumber = whatsappInfo?.id?.split(':')[0] || null;
        const whatsappId = whatsappInfo?.id || null; // ID completo com @s.whatsapp.net
        
        console.log(`📱 WhatsApp conectado - Número: ${phoneNumber}`);
        console.log(`📱 WhatsApp ID completo: ${whatsappId}`);
        
        // Verificar se já existe uma conexão ativa com o mesmo número de telefone
        if (phoneNumber) {
          const { data: duplicateSessions, error: duplicateError } = await supabase
            .from('whatsapp_sessions')
            .select('*')
            .eq('owner_id', userId)
            .eq('phone_number', phoneNumber)
            .eq('status', 'connected')
            .neq('connection_id', connectionId);
          
          if (duplicateError) {
            console.error('Erro ao verificar duplicatas por número:', duplicateError);
          } else if (duplicateSessions && duplicateSessions.length > 0) {
            console.log(`⚠️ Número ${phoneNumber} já está conectado em outra sessão`);
            
            // Marcar esta conexão como duplicata e desconectar
            await updateConnectionStatus(connectionId, 'duplicate', {
              qr_code: null,
              phone_number: phoneNumber,
              whatsapp_info: whatsappInfo,
              duplicate_reason: 'PHONE_NUMBER_ALREADY_CONNECTED'
            }, userId);
            
            // Desconectar a conexão duplicata
            sock.logout();
            activeConnections.delete(connectionId);
            
            // Emitir evento de duplicata para o frontend
            io.emit('connectionDuplicate', { 
              connectionId: connectionId,
              phoneNumber: phoneNumber,
              existingConnections: duplicateSessions.map(s => s.connection_id)
            });
            
            return;
          }
        }
        
        // Salvar sessão conectada no Supabase com número do telefone e WhatsApp ID
        await updateConnectionStatus(connectionId, 'connected', {
          qr_code: null, // Limpar QR code quando conectado
          phone_number: phoneNumber,
          whatsapp_id: whatsappId, // ID completo com @s.whatsapp.net
          whatsapp_info: whatsappInfo
        }, userId);
        
        // Emitir status de conexão
        io.emit('connectionUpdate', { 
          connectionId: connectionId, 
          update: { connection: 'open' } 
        });
      }
    });
    
    // Evento de credenciais
    sock.ev.on('creds.update', saveCreds);
    
    // Evento de mensagens
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const messages = m.messages || [];
        console.log(`📨 Recebidas ${messages.length} mensagens para ${connectionId}`);
        
        for (const message of messages) {
          // Normalizar mensagem usando o message-normalizer
          const messageData = mapToDbRow(message, null, connectionId, '00000000-0000-0000-0000-000000000000');
          
          // Criar ID de atendimento como UUID válido (opcional, pode ser null)
          const atendimentoId = messageData.chat_id ? 
            `00000000-0000-0000-0000-${messageData.chat_id.replace('@s.whatsapp.net', '').padStart(12, '0')}` : 
            null;
          
          messageData.atendimento_id = atendimentoId;
          
          // Determinar status baseado no remetente
          if (messageData.remetente === 'CLIENTE') {
            messageData.status = 'AGUARDANDO'; // Cliente aguardando resposta
          } else if (messageData.remetente === 'AI') {
            messageData.status = 'AI'; // Resposta da IA
          } else {
            messageData.status = 'ATENDIDO'; // Resposta de operador humano
          }
          
          // Processar mídia se necessário
          try {
            if (isMediaTipo(messageData.message_type)) {
              const keyPrefix = [
                messageData.owner_id,
                messageData.atendimento_id,
                messageData.message_id || `msg_${Date.now()}`
              ].join('/');

              const uploaded = await fetchAndUploadMedia({
                supabase,
                bucket: 'whatsapp',
                keyPrefix,
                msg: message
              });

              messageData.media_url  = uploaded.url;
              messageData.media_mime = uploaded.mime;
            }
          } catch (err) {
            console.log('⚠️ Falha ao processar mídia (seguindo sem media_url):', err.message);
          }
          
          // Salvar mensagem no banco
          const { error: insertError } = await supabase
            .from('whatsapp_mensagens')
            .insert(messageData);
          
          if (insertError) {
            console.error('Erro ao salvar mensagem:', insertError);
            continue;
          }
          
          // Emitir para o frontend
          io.to(`${connectionId}-${atendimentoId}`).emit('newMessage', {
            ...messageData,
            id: messageData.message_id
          });
          
          // LEFT PANE live update (connection-level room)
          const preview = previewLabel(messageData.message_type, messageData.conteudo, messageData.duration_ms);
          io.to(connectionId).emit('conversation:updated', {
            connectionId,
            conversationId: messageData.atendimento_id,
            lastMessageAt: messageData.timestamp,
            preview,
            from: messageData.remetente // 'CLIENTE' or 'ATENDENTE'
          });
        }
      } catch (error) {
        console.error('Erro ao processar mensagens:', error);
      }
    });
    
    // Armazenar conexão
    const connectionData = {
      id: connectionId,
      name: `Conexão ${connectionId}`,
      connectionState: 'disconnected',
      isConnected: false,
      phoneNumber: null,
      whatsappInfo: null,
      qrCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sock
    };
    
    activeConnections.set(connectionId, connectionData);
    
    // Salvar sessão inicial no Supabase
    await saveSessionToSupabase(connectionId, {
      name: connectionData.name,
      status: 'disconnected'
    }, userId);
    
    return sock;
  } catch (error) {
    console.error(`❌ Erro ao criar conexão WhatsApp para ${connectionId}:`, error);
    throw error;
  }
}

// Endpoints da API

// Health check endpoint
app.get('/api/baileys-simple/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: activeConnections.size,
    version: '1.0.0'
  });
});

// Listar conexões
app.get('/api/baileys-simple/connections', async (req, res) => {
  try {
    // Obter user_id do header ou query parameter
    const userId = req.headers['x-user-id'] || req.query.user_id || '00000000-0000-0000-0000-000000000000';
    
    console.log(`📋 Listando conexões para usuário: ${userId}`);
    
    // Carregar apenas conexões conectadas do usuário específico do Supabase
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'connected')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar sessões do Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao carregar conexões'
      });
    }
    
    // Remover duplicatas baseado em connection_id (manter apenas a mais recente)
    const uniqueSessions = [];
    const seenConnectionIds = new Set();
    
    for (const session of sessions || []) {
      if (!seenConnectionIds.has(session.connection_id)) {
        seenConnectionIds.add(session.connection_id);
        uniqueSessions.push(session);
      }
    }
    
    // Filtrar apenas conexões que estão ativas no servidor E realmente conectadas
    const activeConnectionsList = Array.from(activeConnections.values());
    const connectedSessions = uniqueSessions.filter(session => {
      const activeConn = activeConnectionsList.find(conn => conn.id === session.connection_id);
      return activeConn && activeConn.isConnected;
    });
    
    const connections = connectedSessions.map(session => {
      const activeConn = activeConnectionsList.find(conn => conn.id === session.connection_id);
      
      return {
        id: session.connection_id,
        name: session.session_name || `Conexão ${session.connection_id}`,
        connectionState: 'connected',
        isConnected: true,
        phoneNumber: session.phone_number || null,
        whatsappId: session.whatsapp_id || null, // ID completo com @s.whatsapp.net
        whatsappInfo: session.whatsapp_info || null,
        qrCode: null, // Não mostrar QR code para conexões conectadas
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    });
    
    console.log(`✅ Encontradas ${connections.length} conexões para usuário ${userId}`);
    
    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Erro ao listar conexões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Criar nova conexão
app.post('/api/baileys-simple/connections', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    // Obter user_id do header ou body
    const userId = req.headers['x-user-id'] || req.body.user_id || '00000000-0000-0000-0000-000000000000';
    
    console.log(`🆕 Criando conexão para usuário: ${userId}`);
    
    // Verificar conexões existentes do usuário específico no Supabase
    const { data: existingSessions, error: checkError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'connected')
      .not('connection_id', 'is', null);
    
    if (checkError) {
      console.error('Erro ao verificar conexões existentes:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar conexões existentes'
      });
    }
    
    // Verificar se já atingiu o limite de 5 conexões para este usuário
    const activeConnectionsCount = existingSessions ? existingSessions.length : 0;
    const maxConnections = 5;
    
    if (activeConnectionsCount >= maxConnections) {
      console.log(`⚠️ Limite de conexões atingido para usuário ${userId}. Ativas: ${activeConnectionsCount}/${maxConnections}`);
      
      return res.status(409).json({
        success: false,
        error: `Limite máximo de ${maxConnections} conexões WhatsApp atingido. Desconecte uma conexão existente para criar uma nova.`,
        code: 'MAX_CONNECTIONS_REACHED',
        data: {
          activeConnections: activeConnectionsCount,
          maxConnections: maxConnections
        }
      });
    }
    
    // Verificar se há conexões ativas com o mesmo número de telefone
    // (Esta verificação será feita após a conexão ser estabelecida e o número ser obtido)
    // Por enquanto, permitimos a criação da conexão
    
    const connectionId = `connection_${Date.now()}`;
    
    console.log(`🆕 Criando nova conexão: ${connectionId}`);
    
    // Criar conexão WhatsApp
    await createWhatsAppConnection(connectionId, userId);
    
    res.json({
      success: true,
      data: {
        connectionId: connectionId,
        name: name || `Conexão ${connectionId}`,
        type: type || 'whatsapp_baileys',
        status: 'disconnected'
      }
    });
  } catch (error) {
    console.error('Erro ao criar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar conexão'
    });
  }
});

// Obter QR Code
app.get('/api/baileys-simple/connections/:connectionId/qr', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = activeConnections.get(connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Conexão não encontrada'
      });
    }
    
    // Buscar QR code do Supabase se não estiver na memória
    let qrCode = connection.qrCode;
    if (!qrCode) {
      const { data: session, error } = await supabase
        .from('whatsapp_sessions')
        .select('qr_code, status')
        .eq('connection_id', connectionId)
        .single();
      
      if (!error && session) {
        qrCode = session.qr_code;
      }
    }
    
    res.json({
      success: true,
      data: {
        qrCode: qrCode,
        connectionState: connection.connectionState,
        isConnected: connection.isConnected
      }
    });
  } catch (error) {
    console.error('Erro ao obter QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter QR code'
    });
  }
});

// Obter informações da conexão
app.get('/api/baileys-simple/connections/:connectionId/info', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = activeConnections.get(connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Conexão não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        connectionState: connection.connectionState,
        isConnected: connection.isConnected,
        phoneNumber: connection.phoneNumber,
        whatsappInfo: connection.whatsappInfo,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao obter informações da conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter informações da conexão'
    });
  }
});

// Refresh QR code
app.post('/api/baileys-simple/connections/:connectionId/refresh-qr', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = activeConnections.get(connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Conexão não encontrada'
      });
    }
    
    console.log(`🔄 Refreshing QR code para ${connectionId}`);
    
    // Reconnect to generate new QR
    if (connection.sock) {
      connection.sock.logout();
    }
    
    await createWhatsAppConnection(connectionId);
    
    res.json({
      success: true,
      message: 'QR code refresh iniciado'
    });
  } catch (error) {
    console.error('Erro ao refresh QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao refresh QR code'
    });
  }
});

// Enviar mensagem
app.post('/api/baileys-simple/connections/:connectionId/send-message', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { message, type = 'text', chatId } = req.body;
    
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.sock) {
      return res.status(404).json({
        success: false,
        error: 'Conexão não encontrada ou não conectada'
      });
    }
    
    console.log(`📤 Enviando mensagem via ${connectionId}: ${type}`);
    
    // Preparar dados da mensagem para salvar no banco
    const messageData = {
      owner_id: process.env.WA_OWNER_ID || '00000000-0000-0000-0000-000000000000',
      chat_id: chatId,
      conteudo: message,
      tipo: type.toUpperCase(),
      remetente: 'ATENDENTE',
      timestamp: new Date().toISOString(),
      message_id: `out_${Date.now()}`,
      media_url: null,
      media_type: null,
      duration_ms: null,
      lida: false,
      raw: {
        key: { remoteJid: chatId, id: `out_${Date.now()}`, fromMe: true },
        messageTimestamp: Date.now(),
        message: { conversation: message }
      }
    };
    
    // Se client enviou uma URL de mídia, persistir como media_url
    if (type !== 'text') {
      messageData.media_url = message; // é já uma URL
    }
    
    // Ensure there is an atendimento for this chat on this connection
    let atendimentoId = undefined;
    {
      const { data: atendimento, error: atdErr } = await supabase
        .from('whatsapp_atendimentos')
        .select('id')
        .eq('chat_id', chatId)
        .eq('status', 'ATIVO')
        .single();
      if (atdErr || !atendimento) {
        const { data: newAtd, error: createErr } = await supabase
          .from('whatsapp_atendimentos')
          .insert({
            chat_id: chatId,
            status: 'ATIVO',
            owner_id: messageData.owner_id,
            connection_id: connectionId
          })
          .select('id')
          .single();
        if (createErr) {
          console.error('Erro ao criar atendimento (outbound):', createErr);
        } else {
          atendimentoId = newAtd?.id;
        }
      } else {
        atendimentoId = atendimento.id;
      }
    }
    messageData.atendimento_id = atendimentoId || messageData.atendimento_id;

    // Enviar via Baileys
    const result = await connection.sock.sendMessage(chatId, { text: message });
    
    // Salvar no banco
    const { error: insertError } = await supabase
      .from('whatsapp_mensagens')
      .insert(messageData);
    
    if (insertError) {
      console.error('Erro ao salvar mensagem enviada:', insertError);
    } else {
      // Emit to the conversation room (center pane) as well
      if (messageData.atendimento_id) {
        io.to(`${connectionId}-${messageData.atendimento_id}`).emit('newMessage', {
          ...messageData,
          id: messageData.message_id
        });
      }
      // LEFT PANE live update (connection-level room)
      const preview = previewLabel(messageData.message_type, messageData.conteudo, messageData.duration_ms);
      io.to(connectionId).emit('conversation:updated', {
        connectionId,
        conversationId: messageData.atendimento_id,
        lastMessageAt: messageData.timestamp,
        preview,
        from: messageData.remetente // 'CLIENTE' or 'ATENDENTE'
      });
    }
    
    res.json({
      success: true,
      data: { messageId: result.key.id }
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem'
    });
  }
});

// Mark all client messages as read for a conversation
app.post('/api/baileys-simple/atendimentos/:atendimentoId/read', async (req, res) => {
  try {
    const { atendimentoId } = req.params;
    const { connectionId } = req.body || {};
    const { error } = await supabase
      .from('whatsapp_mensagens')
      .update({ lida: true })
      .eq('atendimento_id', atendimentoId)
      .eq('remetente', 'CLIENTE')
      .eq('lida', false);

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (connectionId) {
      io.to(connectionId).emit('conversation:read', { connectionId, conversationId: atendimentoId });
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Erro ao marcar como lido' });
  }
});

// Abort connection
app.post('/api/baileys-simple/connections/:connectionId/abort', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.headers['x-user-id'] || req.body.user_id || '00000000-0000-0000-0000-000000000000';
    const connection = activeConnections.get(connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Conexão não encontrada'
      });
    }
    
    console.log(`🛑 Abortando conexão ${connectionId} para usuário ${userId}`);
    
    if (connection.sock) {
      connection.sock.logout();
    }
    
    // Marcar como desconectado no Supabase antes de remover
    await updateConnectionStatus(connectionId, 'disconnected', {}, userId);
    
    // Remover da memória
    activeConnections.delete(connectionId);
    
    // Remover do Supabase
    await removeSessionFromSupabase(connectionId);
    
    // Emitir evento de remoção para o frontend
    io.emit('connectionRemoved', { connectionId });
    
    res.json({
      success: true,
      message: 'Conexão abortada'
    });
  } catch (error) {
    console.error('Erro ao abortar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao abortar conexão'
    });
  }
});

// DELETE /api/baileys-simple/connections/:connectionId - Deletar conexão completamente
app.delete('/api/baileys-simple/connections/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.headers['x-user-id'] || req.body.user_id || '00000000-0000-0000-0000-000000000000';
    const connection = activeConnections.get(connectionId);
    
    console.log(`🗑️ Deletando conexão ${connectionId} para usuário ${userId}`);
    
    // Se a conexão estiver ativa, desconectar primeiro
    if (connection && connection.sock) {
      console.log(`🔌 Desconectando conexão ativa ${connectionId}`);
      connection.sock.logout();
    }
    
    // Marcar como desconectado no Supabase antes de remover
    await updateConnectionStatus(connectionId, 'disconnected', {}, userId);
    
    // Remover da memória
    activeConnections.delete(connectionId);
    
    // Remover do Supabase
    await removeSessionFromSupabase(connectionId);
    
    // Emitir evento de remoção para o frontend
    io.emit('connectionRemoved', { connectionId });
    
    console.log(`✅ Conexão ${connectionId} deletada com sucesso`);
    
    res.json({
      success: true,
      message: 'Conexão deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar conexão'
    });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado via Socket.IO');

  socket.on('join', (data) => {
    const { tenantId, connectionId, conversationId } = data;
    console.log(`👤 Cliente entrou na sala: ${connectionId}/${conversationId}`);
    socket.join(`${connectionId}-${conversationId}`);
  });

  // NEW: room for the *whole* connection (left pane updates)
  socket.on('joinConnection', ({ connectionId }) => {
    console.log(`👥 Cliente entrou na sala de conexão: ${connectionId}`);
    socket.join(connectionId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado do Socket.IO');
  });
});

// Função para inicializar servidor
async function initializeServer() {
  try {
    // Carregar sessões existentes do Supabase
    const existingSessions = await loadExistingSessions();
    
    // Reconectar sessões que estavam conectadas
    for (const session of existingSessions) {
      if (session.status === 'connected') {
        console.log(`🔄 Reconectando sessão: ${session.connection_id}`);
        try {
          await createWhatsAppConnection(session.connection_id);
        } catch (error) {
          console.error(`❌ Erro ao reconectar ${session.connection_id}:`, error);
          // Remover sessão que não conseguiu reconectar
          await removeSessionFromSupabase(session.connection_id);
        }
      }
    }
    
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 WhatsApp Baileys Server rodando na porta ${PORT}`);
      console.log(`📱 API disponível em http://localhost:${PORT}/api`);
      console.log(`🔗 Teste: http://localhost:${PORT}/api/test`);
      console.log(`📋 Conexões ativas: ${activeConnections.size}`);
      console.log(`🔌 Socket.IO ativo para tempo real`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Inicializar servidor
initializeServer();
