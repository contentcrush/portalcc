export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Gerenciar configurações da aplicação</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-center py-8 text-gray-500">
          Página de configurações em desenvolvimento.
        </p>
      </div>
    </div>
  );
}