import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SyncFinancialDatesButtonProps {
  projectId: number;
}

export function SyncFinancialDatesButton({ projectId }: SyncFinancialDatesButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncDates = async () => {
    try {
      setIsSyncing(true);
      const response = await apiRequest('POST', `/api/projects/${projectId}/sync-financial-dates`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Datas sincronizadas",
          description: result.message || "Documentos financeiros atualizados com as datas do projeto",
          variant: "default"
        });
        
        // Invalida o cache para recarregar os documentos financeiros
        queryClient.invalidateQueries(['/api/financial-documents']);
        queryClient.invalidateQueries([`/api/projects/${projectId}/financial-documents`]);
        queryClient.invalidateQueries(['/api/financial-documents/project', projectId]);
      } else {
        toast({
          title: "Aviso",
          description: result.message || "Não foi possível sincronizar as datas",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Ocorreu um erro ao sincronizar as datas",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSyncDates}
      disabled={isSyncing}
      className="h-7 px-2 text-xs"
      title="Sincronizar datas do projeto com documentos financeiros"
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Sincronizando
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 mr-1" />
          Sync Datas
        </>
      )}
    </Button>
  );
}