import { useState } from "react";

export default function WhatsAppTest() {
  const [active, setActive] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-white border-b">
        <h1 className="text-2xl font-bold">WhatsApp Test</h1>
      </div>
      
      <div className="flex-1 p-4 bg-gray-50">
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Teste de Funcionamento</h2>
          <p className="text-gray-600 mb-4">
            Se você está vendo esta página, o React está funcionando corretamente.
          </p>
          <button 
            onClick={() => setActive(!active)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {active ? "Desativar" : "Ativar"} Teste
          </button>
          {active && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
              ✅ Componente funcionando corretamente!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
