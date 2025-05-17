import { Router } from "express";
import { authenticateJWT, requireRole } from "../auth";
import { syncProjectDatesWithFinancialDocuments } from "../automation";
import { WebSocket } from "ws";

// Router específico para sincronização de datas financeiras
const router = Router();

// Referências para os servidores de WebSocket
let io: any;
let wss: any;

export function setupSyncFinancialRoutes(ioServer: any, wsServer: any) {
  io = ioServer;
  wss = wsServer;
  return router;
}

// Endpoint para sincronização manual das datas do projeto com documentos financeiros
router.post("/projects/:id/sync-financial-dates", authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    console.log(`[API] Solicitação de sincronização de datas financeiras para o projeto ID:${projectId}`);
    
    const result = await syncProjectDatesWithFinancialDocuments(projectId);
    
    if (result.success) {
      // Emitir evento via Socket.IO para notificar outros usuários
      if (io) {
        io.emit("financial_updated", { 
          type: "dates_synchronized", 
          projectId
        });
      }
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (wss) {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "financial_updated",
              action: "dates_synchronized",
              data: { projectId } 
            }));
          }
        });
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Erro ao sincronizar datas financeiras:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Falha ao sincronizar datas financeiras" 
    });
  }
});

export default router;