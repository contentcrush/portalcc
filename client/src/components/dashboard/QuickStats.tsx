import { DashboardCard } from "./DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface QuickStatItemProps {
  label: string;
  value: number | string;
  status?: "normal" | "warning" | "alert";
  href?: string;
}

function QuickStatItem({ label, value, status = "normal", href }: QuickStatItemProps) {
  const colorMap = {
    normal: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    alert: "bg-red-100 text-red-700 hover:bg-red-200"
  };

  const Content = () => (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  return href ? (
    <Link href={href}>
      <Button 
        variant="ghost" 
        className={`w-full justify-between hover:cursor-pointer ${colorMap[status]}`}
      >
        <Content />
      </Button>
    </Link>
  ) : (
    <div className={`px-4 rounded-md ${colorMap[status]}`}>
      <Content />
    </div>
  );
}

export function QuickStats() {
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });
  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: clients = [] } = useQuery({ queryKey: ['/api/clients'] });
  const { data: financialDocuments = [] } = useQuery({ queryKey: ['/api/financial-documents'] });
  const { data: expenses = [] } = useQuery({ queryKey: ['/api/expenses'] });

  // Calculate metrics
  const activeProjects = projects.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  ).length;

  const lateProjects = projects.filter(p => 
    p.status === 'atrasado'
  ).length;

  const pendingTasks = tasks.filter(t => 
    !t.completed
  ).length;

  const lateTasks = tasks.filter(t => 
    !t.completed && new Date(t.due_date) < new Date()
  ).length;

  const activeClients = clients.filter(c => 
    c.active
  ).length;

  // Calcular valores financeiros
  const receivables = financialDocuments
    .filter(doc => doc.status !== 'paid')
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

  const payables = expenses
    .filter(exp => !exp.paid)
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Calcular margem bruta (receita total - despesas totais)
  const totalRevenue = financialDocuments
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

  const totalExpenses = expenses
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const grossMargin = totalRevenue - totalExpenses;

  return (
    <DashboardCard 
      title="Visão-rápida" 
      description="Clicável → filtram para a respectiva página"
    >
      <div className="space-y-2 mt-2">
        <QuickStatItem
          label="1. Projetos ativos"
          value={activeProjects}
          href="/projects?status=active"
          status="normal"
        />
        <QuickStatItem
          label="2. Projetos atrasados"
          value={lateProjects}
          href="/projects?status=atrasado"
          status={lateProjects > 0 ? "alert" : "normal"}
        />
        <QuickStatItem
          label="3. Tarefas pendentes"
          value={pendingTasks}
          href="/tasks?status=pending"
          status={pendingTasks > 5 ? "warning" : "normal"}
        />
        <QuickStatItem
          label="4. Tarefas atrasadas"
          value={lateTasks}
          href="/tasks?status=late"
          status={lateTasks > 0 ? "alert" : "normal"}
        />
        <QuickStatItem
          label="5. Clientes ativos"
          value={activeClients}
          href="/clients?status=active"
          status="normal"
        />
        <QuickStatItem
          label="6. Receita a receber (aberto)"
          value={formatCurrency(receivables)}
          href="/financial?tab=receivables"
          status={receivables > 10000 ? "warning" : "normal"}
        />
        <QuickStatItem
          label="7. Contas a pagar (aberto)"
          value={formatCurrency(payables)}
          href="/financial?tab=payables"
          status={payables > 5000 ? "warning" : "normal"}
        />
        <QuickStatItem
          label="8. Margem bruta do mês"
          value={formatCurrency(grossMargin)}
          status={grossMargin < 0 ? "alert" : "normal"}
        />
      </div>
    </DashboardCard>
  );
}