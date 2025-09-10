"use client";

import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Settings, Wifi, WifiOff } from 'lucide-react';
import WhatsAppV2ConversationsList from '@/components/WhatsAppV2ConversationsList';
import WhatsAppV2ChatWindow from '@/components/WhatsAppV2ChatWindow';
import { useWhatsAppV2Sessions } from '@/hooks/useWhatsAppV2Sessions';

export default function WhatsAppV2Page() {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [ownerId] = useState('f8451154-cea5-43a3-8f75-d64c07056e04'); // TODO: Get from auth context
  
  const { 
    sessions, 
    loading: sessionsLoading, 
    startSession, 
    stopSession 
  } = useWhatsAppV2Sessions(ownerId);

  const activeSession = sessions.find(s => s.status === 'CONNECTED');

  const handleStartSession = async () => {
    try {
      const sessionName = `session-${Date.now()}`;
      await startSession(sessionName);
      console.log('Sessão iniciada:', sessionName);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    
    try {
      await stopSession(activeSession.session_name);
      console.log('Sessão parada');
    } catch (error) {
      console.error('Erro ao parar sessão:', error);
    }
  };

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = (message: any) => {
    console.log('Mensagem enviada:', message);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">WhatsApp V2</h1>
                <p className="text-sm text-gray-500">
                  {activeSession ? 'Conectado' : 'Desconectado'} • 
                  {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                {activeSession ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">Desconectado</span>
                  </>
                )}
              </div>

              {/* Session Controls */}
              {activeSession ? (
                <button
                  onClick={handleStopSession}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={sessionsLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {sessionsLoading ? 'Conectando...' : 'Conectar'}
                </button>
              )}

              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations */}
        <div className="w-80 bg-white border-r flex flex-col">
          <WhatsAppV2ConversationsList
            ownerId={ownerId}
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        {/* Right Panel - Chat or Welcome */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <WhatsAppV2ChatWindow
              conversation={selectedConversation}
              ownerId={ownerId}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Escolha uma conversa da lista ao lado para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            WhatsApp V2 • Integração Supabase • Realtime
          </div>
          <div>
            {activeSession ? (
              <span className="text-green-600">● Online</span>
            ) : (
              <span className="text-red-600">● Offline</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
