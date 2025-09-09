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
    tipo: 'TEXTO',
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
    case 'TEXT':         row.tipo='TEXTO';         row.conteudo=c.text; break;
    case 'IMAGE':        row.tipo='IMAGEM';        row.conteudo=c.caption ?? ''; row.media_type=c.mimetype ?? null; break;
    case 'VIDEO':        row.tipo='VIDEO';         row.conteudo=c.caption ?? ''; row.media_type=c.mimetype ?? null; break;
    case 'AUDIO':        row.tipo='AUDIO';         row.conteudo=''; row.media_type=c.mimetype ?? null; row.duration_ms=Math.round((c.seconds ?? 0)*1000); break;
    case 'STICKER':      row.tipo='STICKER';       row.conteudo=''; row.media_type=c.mimetype ?? null; break;
    case 'FILE':         row.tipo='ARQUIVO';       row.conteudo=c.fileName ?? ''; row.media_type=c.mimetype ?? null; break;
    case 'LOCATION':     row.tipo='LOCALIZACAO';   row.conteudo= c.name ? `${c.name} (${c.lat}, ${c.lng})` : `${c.lat}, ${c.lng}`; break;
    case 'BUTTON_REPLY': row.tipo='RESPOSTA_BOTAO';row.conteudo=c.text ?? c.id ?? ''; break;
    case 'LIST_REPLY':   row.tipo='RESPOSTA_LISTA';row.conteudo=c.text ?? c.id ?? ''; break;
    case 'TEMPLATE_REPLY': row.tipo='RESPOSTA_TEMPLATE'; row.conteudo=c.text ?? c.id ?? ''; break;
    default:             row.tipo='DESCONHECIDO';  row.conteudo='EMPTY';
  }

  return row;
}

module.exports = { resolveWaContent, mapToDbRow };
