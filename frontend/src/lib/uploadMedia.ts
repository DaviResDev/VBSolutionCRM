import { createClient } from '@supabase/supabase-js';
import { ulid } from 'ulid';

// Configurar cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadToWaBucket(params: {
  connectionId: string;
  chatId: string;
  file: File;
}) {
  const ext = params.file.name.split('.').pop() || 'bin';
  const key = `${params.connectionId}/${params.chatId}/${ulid()}.${ext}`;

  const { error } = await supabase.storage.from('wa-media').upload(key, params.file, {
    contentType: params.file.type || 'application/octet-stream',
    upsert: false,
  });
  
  if (error) throw error;

  return { mediaKey: key, mimeType: params.file.type || 'application/octet-stream' };
}

