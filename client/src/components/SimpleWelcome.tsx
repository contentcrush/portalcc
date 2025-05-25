export default function SimpleWelcome() {
  return (
    <div style={{ 
      backgroundColor: '#3B82F6', 
      color: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
        🌟 Boa tarde, Zé!
      </h2>
      <p style={{ margin: '0', fontSize: '16px' }}>
        Bem-vindo ao seu painel personalizado! Aqui você pode acompanhar todos os seus projetos e tarefas.
      </p>
    </div>
  );
}