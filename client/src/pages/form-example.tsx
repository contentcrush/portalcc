import FormPersistenceExample from "@/components/FormPersistenceExample";

export default function FormExamplePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Sistema de Persistência de Formulários</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="p-6 bg-white rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Sobre esta funcionalidade</h2>
            <p className="mb-3">
              Esta página demonstra o novo sistema de persistência de formulários implementado no Content Crush.
            </p>
            <p className="mb-3">
              A funcionalidade permite que os dados dos formulários sejam salvos automaticamente enquanto você os preenche,
              evitando a perda de informações caso a sessão expire ou a página seja fechada acidentalmente.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-3">Como funciona:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Os dados são salvos automaticamente a cada poucos segundos</li>
              <li>Se você fechar ou recarregar a página, os dados serão recuperados</li>
              <li>Após o envio bem-sucedido, os dados salvos são limpos</li>
              <li>O botão "Limpar Formulário" permite remover os dados salvos manualmente</li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">Benefícios:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Evita perda de dados em formulários longos</li>
              <li>Funciona mesmo quando a sessão expira</li>
              <li>Processo totalmente automático e transparente</li>
              <li>Melhora a experiência do usuário ao preencher formulários</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Instruções</h2>
            <p className="mb-3">
              Para testar a funcionalidade:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Comece a preencher o formulário ao lado</li>
              <li>Observe a seção "Dados salvos automaticamente" sendo atualizada</li>
              <li>Recarregue a página e veja que os dados permanecem</li>
              <li>Use o botão "Limpar Formulário" para remover os dados salvos</li>
            </ol>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-amber-800 text-sm">
                <strong>Nota:</strong> Esta funcionalidade já está integrada em todos os formulários
                importantes do sistema, incluindo criação/edição de projetos, tarefas, clientes e registros financeiros.
              </p>
            </div>
          </div>
        </div>
        <div>
          <FormPersistenceExample />
        </div>
      </div>
    </div>
  );
}