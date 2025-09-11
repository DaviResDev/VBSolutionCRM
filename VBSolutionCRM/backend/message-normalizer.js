// backend/message-normalizer.js
function unwrapMessageLayer(m) {
  if (!m) return {};
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
  return m ?? {};
}
function getContentType(m) {
  if (m.conversation) return 'conversation';
  if (m.extendedTextMessage) return 'extendedTextMessage';
  if (m.imageMessage) return 'imageMessage';
  if (m.videoMessage) return 'videoMessage';
  if (m.audioMessage) return 'audioMessage';
  if (m.stickerMessage) return 'stickerMessage';
  if (m.documentMessage) return 'documentMessage';
  if (m.locationMessage) return 'locationMessage';
  if (m.buttonsResponseMessage) return 'buttonsResponseMessage';
  if (m.listResponseMessage) return 'listResponseMessage';
  if (m.templateButtonReplyMessage) return 'templateButtonReplyMessage';
  return null;
}
function resolveWaContent(msg) {
  let m = unwrapMessageLayer(msg.message);
  const rawType = getContentType(m) || null;

  if (m.conversation) return { kind: 'TEXT', text: m.conversation };
  if (m.extendedTextMessage?.text) return { kind: 'TEXT', text: m.extendedTextMessage.text };

  if (m.imageMessage)  return { kind: 'IMAGE',  caption: m.imageMessage.caption ?? null,  mimetype: m.imageMessage.mimetype ?? null };
  if (m.videoMessage)  return { kind: 'VIDEO',  caption: m.videoMessage.caption ?? null,  mimetype: m.videoMessage.mimetype ?? null };
  if (m.audioMessage)  return { kind: 'AUDIO',  seconds: Number(m.audioMessage.seconds ?? 0), mimetype: m.audioMessage.mimetype ?? null, ptt: !!m.audioMessage.ptt };
  if (m.stickerMessage)return { kind: 'STICKER',mimetype: m.stickerMessage.mimetype ?? null };
  if (m.documentMessage)return { kind: 'FILE',   fileName: m.documentMessage.fileName ?? null, mimetype: m.documentMessage.mimetype ?? null };

  if (m.locationMessage) {
    return { kind: 'LOCATION', lat: Number(m.locationMessage.degreesLatitude), lng: Number(m.locationMessage.degreesLongitude), name: m.locationMessage.name ?? null };
  }
  if (m.buttonsResponseMessage)  return { kind:'BUTTON_REPLY',  id: m.buttonsResponseMessage.selectedButtonId ?? null, text: m.buttonsResponseMessage.selectedDisplayText ?? null };
  if (m.listResponseMessage)     return { kind:'LIST_REPLY',    id: m.listResponseMessage.singleSelect?.selectedRowId ?? null, text: m.listResponseMessage.title ?? null };
  if (m.templateButtonReplyMessage) {
    const t = m.templateButtonReplyMessage;
    return { kind:'TEMPLATE_REPLY', id: t.selectedId ?? null, text: t.selectedDisplayText ?? null };
  }
  return { kind: 'UNKNOWN', rawType };
}

function mapToDbRow(msg, chat_id, connection_id, owner_id) {
  const from_me   = !!msg.key?.fromMe;
  const wa_ts_iso = new Date(Number(msg.messageTimestamp || 0) * 1000).toISOString();
  const c         = resolveWaContent(msg);

  const row = {
    owner_id,
    // atendimento_id: (set later by server)
    chat_id: msg.key?.remoteJid || chat_id || null,
    conteudo: '',
    message_type: 'TEXTO',
    media_type: null,
    remetente: from_me ? 'ATENDENTE' : 'CLIENTE',
    timestamp: wa_ts_iso,
    lida: false,

    message_id: msg.key?.id ?? null,
    media_url: null,
    media_mime: null,
    duration_ms: null,

    // <- raw must be an object for jsonb
    raw: {
      key: { remoteJid: msg.key?.remoteJid, id: msg.key?.id, fromMe: from_me },
      messageTimestamp: msg.messageTimestamp,
      message: msg.message ?? null
    }
  };

  switch (c.kind) {
    case 'TEXT':         
      row.message_type = 'TEXTO';         
      row.conteudo = c.text || ''; 
      break;
    case 'IMAGE':        
      row.message_type = 'IMAGEM';        
      row.conteudo = c.caption || '[Imagem]'; 
      row.media_type = c.mimetype || 'image/jpeg';
      row.media_mime = c.mimetype || 'image/jpeg';
      // media_url será preenchida pelo servidor após download
      break;
    case 'VIDEO':        
      row.message_type = 'VIDEO';         
      row.conteudo = c.caption || '[Vídeo]'; 
      row.media_type = c.mimetype || 'video/mp4';
      row.media_mime = c.mimetype || 'video/mp4';
      // media_url será preenchida pelo servidor após download
      break;
    case 'AUDIO':        
      row.message_type = 'AUDIO';         
      row.conteudo = '[Áudio]'; 
      row.media_type = c.mimetype || 'audio/ogg';
      row.media_mime = c.mimetype || 'audio/ogg';
      row.duration_ms = Math.round((c.seconds ?? 0) * 1000);
      // media_url será preenchida pelo servidor após download
      break;
    case 'STICKER':      
      row.message_type = 'STICKER';       
      row.conteudo = '[Sticker]'; 
      row.media_type = c.mimetype || 'image/webp';
      row.media_mime = c.mimetype || 'image/webp';
      // media_url será preenchida pelo servidor após download
      break;
    case 'FILE':         
      row.message_type = 'ARQUIVO';       
      row.conteudo = c.fileName || '[Arquivo]'; 
      row.media_type = c.mimetype || 'application/octet-stream';
      row.media_mime = c.mimetype || 'application/octet-stream';
      // media_url será preenchida pelo servidor após download
      break;
    case 'LOCATION':     
      row.message_type = 'LOCALIZACAO';   
      row.conteudo = c.name ? `${c.name} (${c.lat}, ${c.lng})` : `Localização: ${c.lat}, ${c.lng}`; 
      break;
    case 'BUTTON_REPLY': 
      row.message_type = 'RESPOSTA_BOTAO';
      row.conteudo = c.text || c.id || '[Resposta de Botão]'; 
      break;
    case 'LIST_REPLY':   
      row.message_type = 'RESPOSTA_LISTA';
      row.conteudo = c.text || c.id || '[Resposta de Lista]'; 
      break;
    case 'TEMPLATE_REPLY': 
      row.message_type = 'RESPOSTA_TEMPLATE'; 
      row.conteudo = c.text || c.id || '[Resposta de Template]'; 
      break;
    default:             
      row.message_type = 'DESCONHECIDO';  
      row.conteudo = '[Mensagem desconhecida]';
  }

  return row;
}

module.exports = { resolveWaContent, mapToDbRow };
