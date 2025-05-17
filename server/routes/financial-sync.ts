import { Router } from 'express';
import { authenticateJWT, requirePermission } from '../auth';
import { syncProjectDatesWithFinancialDocuments } from '../automation';
import { io } from '../socket';

const router = Router();

// Endpoint para sincronizar datas de documentos financeiros com as datas do projeto
router.post('/sync/:projectId', authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log(`[Sistema] Solicitação manual de sincronização para o projeto ID:${projectId}`);
    
    // Chamar a função de sincronização
    const result = await syncProjectDatesWithFinancialDocuments(parseInt(projectId, 10));
    
    if (result.success) {
      // Notificar os clientes sobre a mudança nos documentos financeiros via WebSocket
      io.emit('financial_update', { 
        type: 'updated', 
        projectId: parseInt(projectId, 10), 
        message: `Documentos financeiros do projeto atualizados: ${result.message}` 
      });
      
      res.json(result);
    } else {
      // Se não houver documentos financeiros, ainda retorna 200 mas com a mensagem explicativa
      res.json(result);
    }
  } catch (error) {
    console.error("Erro na sincronização de datas:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao sincronizar datas do projeto com documentos financeiros", 
      error: error.message 
    });
  }
});

export default router;