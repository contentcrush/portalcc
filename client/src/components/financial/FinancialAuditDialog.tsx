import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Shield, Clock, User, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialAuditDialogProps {
  documentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditLog {
  id: number;
  document_id: number;
  action: string;
  user_id: number;
  timestamp: string;
  old_values: any;
  new_values: any;
  reason: string;
  ip_address: string;
  user_agent: string;
  session_id: string;
  checksum: string;
}

interface IntegrityCheck {
  document_id: number;
  integrity_verified: boolean;
  timestamp: string;
}

export function FinancialAuditDialog({ documentId, open, onOpenChange }: FinancialAuditDialogProps) {
  const [showIntegrityCheck, setShowIntegrityCheck] = useState(false);

  // Buscar histórico de auditoria
  const { data: auditHistory, isLoading: isLoadingHistory } = useQuery<AuditLog[]>({
    queryKey: ["/api/financial-documents", documentId, "audit-history"],
    enabled: open && documentId > 0,
  });

  // Verificar integridade (só quando solicitado)
  const { data: integrityCheck, isLoading: isCheckingIntegrity, refetch: checkIntegrity } = useQuery<IntegrityCheck>({
    queryKey: ["/api/financial-documents", documentId, "verify-integrity"],
    enabled: false, // Só executa quando chamado manualmente
  });

  const handleIntegrityCheck = () => {
    setShowIntegrityCheck(true);
    checkIntegrity();
  };

  const getActionBadge = (action: string) => {
    const actions: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      create: { label: "Criado", variant: "default" },
      update: { label: "Atualizado", variant: "secondary" },
      approve: { label: "Aprovado", variant: "default" },
      archive: { label: "Arquivado", variant: "outline" },
      cancel: { label: "Cancelado", variant: "destructive" },
    };

    const config = actions[action] || { label: action, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatChanges = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return 'Dados de alteração não disponíveis';

    try {
      const changes: string[] = [];
      
      // Comparar campos importantes
      const fieldsToCheck = ['amount', 'status', 'paid', 'due_date', 'description'];
      
      fieldsToCheck.forEach(field => {
        if (oldValues[field] !== newValues[field]) {
          const oldVal = oldValues[field] ?? 'N/A';
          const newVal = newValues[field] ?? 'N/A';
          changes.push(`${field}: ${oldVal} → ${newVal}`);
        }
      });

      return changes.length > 0 ? changes.join(', ') : 'Nenhuma alteração detectada';
    } catch (error) {
      console.error('Erro ao formatar alterações:', error);
      return 'Erro ao processar alterações';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Auditoria Financeira - Documento #{documentId}
          </DialogTitle>
          <DialogDescription>
            Histórico completo de alterações e verificação de integridade dos dados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Verificação de Integridade */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Verificação de Integridade</h3>
                <p className="text-sm text-muted-foreground">
                  Validar se os dados de auditoria não foram alterados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showIntegrityCheck && integrityCheck && (
                <div className="flex items-center gap-2 mr-3">
                  {integrityCheck.integrity_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    integrityCheck.integrity_verified ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {integrityCheck.integrity_verified ? 'Íntegro' : 'Comprometido'}
                  </span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleIntegrityCheck}
                disabled={isCheckingIntegrity}
              >
                {isCheckingIntegrity ? 'Verificando...' : 'Verificar Integridade'}
              </Button>
            </div>
          </div>

          {/* Histórico de Auditoria */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico de Alterações
            </h3>
            
            <ScrollArea className="h-[400px] border rounded-lg">
              {isLoadingHistory ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Carregando histórico...
                </div>
              ) : auditHistory && auditHistory.length > 0 ? (
                <div className="space-y-3 p-4">
                  {auditHistory.map((log) => (
                    <div key={log.id} className="border-l-2 border-blue-200 pl-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <span className="text-sm text-muted-foreground">
                            {log.timestamp ? format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data inválida'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Usuário #{log.user_id}
                        </div>
                      </div>
                      
                      {log.reason && (
                        <div className="mb-2">
                          <p className="text-sm font-medium">Motivo:</p>
                          <p className="text-sm text-muted-foreground">{log.reason}</p>
                        </div>
                      )}
                      
                      {log.old_values && log.new_values && (
                        <div className="mb-2">
                          <p className="text-sm font-medium">Alterações:</p>
                          <p className="text-sm text-muted-foreground">
                            {formatChanges(log.old_values, log.new_values)}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>IP: {log.ip_address || 'N/A'}</span>
                        <span>Sessão: {log.session_id ? `${log.session_id.substring(0, 8)}...` : 'N/A'}</span>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>Hash: {log.checksum ? `${log.checksum.substring(0, 8)}...` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum registro de auditoria encontrado
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}