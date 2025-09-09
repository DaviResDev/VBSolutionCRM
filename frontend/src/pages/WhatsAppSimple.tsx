export default function WhatsAppSimple() {
  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-white border-b">
        <h1 className="text-2xl font-bold">WhatsApp - Teste Simples</h1>
      </div>
      
      <div className="flex-1 p-4 bg-gray-50">
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">✅ Página Carregando Corretamente</h2>
          <p className="text-gray-600 mb-4">
            Se você está vendo esta mensagem, o React está funcionando e a página está carregando.
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-green-100 text-green-800 rounded">
              ✅ Componente React funcionando
            </div>
            <div className="p-3 bg-blue-100 text-blue-800 rounded">
              ✅ Roteamento funcionando
            </div>
            <div className="p-3 bg-purple-100 text-purple-800 rounded">
              ✅ Estilos CSS funcionando
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
