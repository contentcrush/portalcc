import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  PauseCircle,
  XCircle,
  CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type ProjectSpecialStatusProps = {
  projectId: number;
  currentStatus: 'delayed' | 'paused' | 'canceled' | 'none';
  isEditable?: boolean;
};

// Objeto de configuração para cada status especial
const statusConfig = {
  none: {
    label: 'Normal',
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    icon: CheckCircle,
    description: 'Projeto em andamento normal'
  },
  delayed: {
    label: 'Atrasado',
    color: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    icon: Clock,
    description: 'Projeto com atraso na entrega'
  },
  paused: {
    label: 'Pausado',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    icon: PauseCircle,
    description: 'Projeto temporariamente pausado'
  },
  canceled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 hover:bg-red-200',
    icon: XCircle,
    description: 'Projeto cancelado'
  }
};

export function ProjectSpecialStatus({ projectId, currentStatus, isEditable = true }: ProjectSpecialStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'delayed' | 'paused' | 'canceled' | 'none'>(currentStatus);
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consultar histórico de status
  const { data: statusHistory, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/status-history`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/status-history`);
      return await res.json();
    },
    enabled: isOpen // Somente buscar quando o diálogo estiver aberto
  });

  // Mutação para atualizar o status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason: string }) => {
      const res = await apiRequest('PATCH', `/api/projects/${projectId}/special-status`, { status, reason });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status atualizado',
        description: `O status do projeto foi alterado para ${statusConfig[selectedStatus].label}`,
        variant: 'default',
        className: 'bg-green-100 text-green-800 border-green-300'
      });
      
      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/status-history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      setIsOpen(false);
      setIsAlertOpen(false);
      setReason('');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do projeto',
        variant: 'destructive'
      });
      console.error('Erro ao atualizar status:', error);
    }
  });

  const handleStatusChange = (value: 'delayed' | 'paused' | 'canceled' | 'none') => {
    setSelectedStatus(value);
  };

  const handleSubmit = () => {
    if (selectedStatus === currentStatus) {
      toast({
        title: 'Sem alterações',
        description: 'O status selecionado é o mesmo do atual',
        variant: 'default'
      });
      return;
    }
    
    // Se o status selecionado for "cancelado", mostrar confirmação
    if (selectedStatus === 'canceled') {
      setIsAlertOpen(true);
    } else {
      // Para outros status, enviar diretamente
      updateStatusMutation.mutate({ status: selectedStatus, reason });
    }
  };
  
  const confirmStatusChange = () => {
    updateStatusMutation.mutate({ status: selectedStatus, reason });
  };

  const StatusIcon = statusConfig[currentStatus].icon;

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${statusConfig[currentStatus].color} cursor-pointer flex items-center gap-1`}
          onClick={() => isEditable && setIsOpen(true)}
        >
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {statusConfig[currentStatus].label}
        </Badge>
        
        {isEditable && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={() => setIsOpen(true)}
          >
            Alterar
          </Button>
        )}
      </div>

      {/* Diálogo principal para alterar status */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Status Especial do Projeto</DialogTitle>
            <DialogDescription>
              Defina um status especial para este projeto. O status especial é independente do estágio atual do projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status Especial</Label>
              <Select 
                value={selectedStatus} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Normal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delayed">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>Atrasado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="paused">
                    <div className="flex items-center gap-2">
                      <PauseCircle className="h-4 w-4 text-blue-600" />
                      <span>Pausado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="canceled">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Cancelado</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {selectedStatus === 'canceled' ? (
                  <span className="text-red-500 font-medium">
                    Atenção: Marcar como cancelado impedirá qualquer avanço nas etapas do projeto.
                  </span>
                ) : (
                  statusConfig[selectedStatus].description
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Motivo da Alteração</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da alteração de status"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Histórico de alterações */}
            {isOpen && statusHistory && statusHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Histórico de alterações</h4>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {statusHistory.map((history: any) => (
                    <div key={history.id} className="text-xs border-b last:border-0 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {history.previous_status !== 'none' ? statusConfig[history.previous_status].label : 'Normal'} → {statusConfig[history.new_status].label}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(history.change_date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {history.reason && (
                        <p className="text-muted-foreground mt-1">{history.reason}</p>
                      )}
                      <div className="text-muted-foreground mt-1">
                        Por: {history.changedBy?.name || 'Sistema'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={updateStatusMutation.isPending || selectedStatus === currentStatus}
            >
              {updateStatusMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para cancelamento */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento do projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a marcar este projeto como <span className="font-medium text-red-600">Cancelado</span>. 
              Esta ação impedirá o avanço do projeto para outras etapas e pode ter impacto nos processos relacionados.
              
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Consequências do cancelamento:
                </p>
                <ul className="text-sm text-red-700 mt-1 space-y-1 pl-6 list-disc">
                  <li>O projeto não poderá avançar para outras etapas</li>
                  <li>Eventos e tarefas relacionados podem ser afetados</li>
                  <li>Documentos financeiros permanecerão no status atual</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Sim, cancelar projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}