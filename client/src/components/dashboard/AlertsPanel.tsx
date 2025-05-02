import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { addDays, isBefore, isAfter } from "date-fns";
import { BellRing, CircleDollarSign, Clock, AlertTriangle, CalendarClock } from "lucide-react";

interface AlertItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

function AlertItem({ icon, title, description, action }: AlertItemProps) {
  return (
    <div className="flex items-start space-x-3 py-2.5 group hover:bg-muted/50 rounded-md px-1">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Link href={action.href}>
          <Button size="sm" variant="outline" className="h-7 text-xs whitespace-nowrap">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

export function AlertsPanel() {
  const { data: financialDocuments = [] } = useQuery({ queryKey: ['/api/financial-documents'] });
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });
  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  
  const today = new Date();
  const next7Days = addDays(today, 7);
  
  // Find invoices due in the next 7 days
  const upcomingInvoices = financialDocuments
    .filter(doc => 
      doc.due_date && 
      !doc.paid && 
      isAfter(new Date(doc.due_date), today) && 
      isBefore(new Date(doc.due_date), next7Days)
    );
    
  // Find overdue projects
  const overBudgetProjects = projects
    .filter(project => {
      // If the project has a budget and expenses
      if (project.budget && project.expenses) {
        return project.expenses > project.budget;
      }
      return false;
    });
    
  // Find tasks without assignees
  const unassignedTasks = tasks
    .filter(task => 
      !task.completed && 
      (!task.assignee_id || task.assignee_id === null)
    );
    
  // Get all alerts
  const alerts = [
    ...upcomingInvoices.map(invoice => ({
      type: 'invoice',
      icon: <CircleDollarSign className="h-5 w-5 text-amber-500" />,
      title: `Fatura vence em menos de 7 dias`,
      description: `${invoice.description || 'Documento'} - ${formatCurrency(invoice.amount || 0)}`,
      action: {
        label: 'Ver fatura',
        href: `/financial?document=${invoice.id}`
      }
    })),
    ...overBudgetProjects.map(project => ({
      type: 'budget',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      title: `Projeto estourou orçamento`,
      description: `${project.name} - Orçado: ${formatCurrency(project.budget || 0)}`,
      action: {
        label: 'Ver projeto',
        href: `/projects/${project.id}`
      }
    })),
    ...unassignedTasks.map(task => ({
      type: 'task',
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      title: `Tarefa crítica sem responsável`,
      description: task.title,
      action: {
        label: 'Atribuir',
        href: `/tasks/${task.id}`
      }
    }))
  ];

  // Limit to 5 alerts
  const limitedAlerts = alerts.slice(0, 5);

  return (
    <DashboardCard 
      title="Alertas" 
      headerAction={
        alerts.length > 0 ? (
          <Badge variant="default" className="flex items-center gap-1">
            <BellRing className="h-3 w-3" />
            <span>{alerts.length}</span>
          </Badge>
        ) : null
      }
    >
      <div className="mt-2 divide-y divide-border">
        {limitedAlerts.length > 0 ? (
          limitedAlerts.map((alert, index) => (
            <AlertItem 
              key={`${alert.type}-${index}`} 
              icon={alert.icon} 
              title={alert.title} 
              description={alert.description} 
              action={alert.action} 
            />
          ))
        ) : (
          <div className="text-center py-6">
            <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum alerta no momento</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}