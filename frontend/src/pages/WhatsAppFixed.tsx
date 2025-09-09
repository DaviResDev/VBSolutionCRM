export default function WhatsAppFixed() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-sm text-gray-500">Status: Conectado</p>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="grid grid-cols-[320px_1fr_360px] gap-4 h-[calc(100vh-200px)]">
          
          {/* Left: Conversations List */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 font-medium border-b bg-gray-50">
              Conversas
            </div>
            <div className="p-4">
              <div className="space-y-2">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="font-medium text-sm">João Silva</div>
                  <div className="text-xs text-gray-500">Olá, preciso de ajuda...</div>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="font-medium text-sm">Maria Santos</div>
                  <div className="text-xs text-gray-500">Obrigada pelo atendimento!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Chat Area - MAIS ALTO */}
          <div className="bg-white rounded-2xl border overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  JS
                </div>
                <div>
                  <div className="font-medium">João Silva</div>
                  <div className="text-xs text-gray-500">Online</div>
                </div>
              </div>
            </div>

            {/* Messages Area - MAIS ALTO */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              <div className="flex justify-start">
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-200">
                  <div>Olá, preciso de ajuda com meu pedido</div>
                  <div className="text-right text-xs opacity-75 mt-1">2 min</div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="max-w-[70%] p-3 rounded-lg bg-blue-500 text-white">
                  <div>Olá! Como posso ajudá-lo hoje?</div>
                  <div className="text-right text-xs opacity-75 mt-1">1 min</div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-200">
                  <div>Gostaria de saber o status do meu pedido #12345</div>
                  <div className="text-right text-xs opacity-75 mt-1">Agora</div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Enviar
                </button>
              </div>
            </div>

            {/* Dashboard Under Chat - MAIS VISÍVEL */}
            <div className="border-t bg-gray-50 p-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">Msgs hoje</div>
                  <div className="text-xl font-bold">32</div>
                  <div className="text-xs text-green-600">+12%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">TMA</div>
                  <div className="text-xl font-bold">1m 42s</div>
                  <div className="text-xs text-green-600">-8%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">Conversões</div>
                  <div className="text-xl font-bold">6</div>
                  <div className="text-xs text-green-600">+2</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">Agente AI</div>
                  <div className="text-xl font-bold">Ativo</div>
                  <div className="text-xs text-green-600">ok</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Details */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 font-medium border-b bg-gray-50">
              Detalhes do Contato
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500">Nome</div>
                  <div className="text-sm">João Silva</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Telefone</div>
                  <div className="text-sm">+55 11 99999-9999</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <div className="text-sm text-green-600">Online</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
