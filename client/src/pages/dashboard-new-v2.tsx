import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PlusIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  MoreVertical,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Cores para as badges de prioridade
const PRIORITY_COLORS = {
  urgente: "bg-rose-100 text-rose-600",
  alta: "bg-amber-100 text-amber-600",
  media: "bg-amber-100 text-amber-600",
  normal: "bg-sky-100 text-sky-600",
  baixa: "bg-green-100 text-green-600"
};

// Componente de badge para status
const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case "em produção":
      case "produção":
      case "em producao":
        return "bg-blue-100 text-blue-600";
      case "em edição":
      case "edição":
      case "em edicao":
        return "bg-indigo-100 text-indigo-600";
      case "pré-produção":
      case "pré produção":
      case "pre-producao":
        return "bg-violet-100 text-violet-600";
      case "concluído":
      case "concluido":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${getStatusConfig()}`}>
      {status}
    </span>
  );
};

// Componente de badge para prioridade
const PriorityBadge = ({ priority }) => {
  const getColor = () => {
    return PRIORITY_COLORS[priority?.toLowerCase()] || "bg-gray-100 text-gray-600";
  };

  return (
    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${getColor()}`}>
      {priority}
    </span>
  );
};

// Barra de progresso personalizada
const ProgressBar = ({ progress }) => {
  const getProgressColor = () => {
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 40) return "bg-amber-500";
    return "bg-blue-500";
  };

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div 
        className={`h-full rounded-full ${getProgressColor()}`} 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Componente de estatística
const StatCard = ({ title, value, subtitle, change, color }) => {
  const isPositive = change > 0;
  const changeColor = isPositive ? "text-emerald-600" : "text-rose-600";
  const changeIcon = isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />;
  const bgColor = `bg-${color}-100`;
  const borderColor = `border-${color}-200`;
  const progressColor = `bg-${color}-500`;

  return (
    <Card className={`border ${borderColor} shadow-sm`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          <Badge variant="outline" className={`${bgColor} border-0 text-xs font-medium ${changeColor}`}>
            <span className="flex items-center gap-0.5">
              {changeIcon}
              {Math.abs(change)}%
            </span>
          </Badge>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-gray-500 ml-2">{subtitle}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1 mt-3">
          <div className={`h-full rounded-full ${progressColor}`} style={{ width: '75%' }} />
        </div>
      </div>
    </Card>
  );
};

export default function Dashboard() {
  const { openProjectForm } = useProjectForm();
  const [viewMode, setViewMode] = useState("semana");

  // Buscar dados da API
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  const { data: financialDocuments } = useQuery({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Calcular métricas com dados reais
  const activeProjects = projects?.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  )?.length || 0;
  
  const pendingTasks = tasks?.filter(t => !t.completed)?.length || 0;
  const lateTasksCount = tasks?.filter(t => !t.completed && new Date(t.due_date) < new Date())?.length || 0;
  
  const activeClientsCount = clients?.length || 0;
  const newClientsThisMonth = 3; // Para demonstração, mas deve usar dados reais
  
  // Calcular receita mensal
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthlyRevenue = financialDocuments?.reduce((sum, doc) => {
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    if (docDate && docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0) || 48500; // Valor padrão para demonstração

  // Projetos mais recentes ou em andamento (limitados a 3)
  const ongoingProjects = projects
    ?.filter(p => p.status !== 'concluido' && p.status !== 'cancelado')
    ?.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))
    ?.slice(0, 3) || [];

  // Próximas tarefas (limitadas a 5)
  const upcomingTasks = tasks
    ?.filter(t => !t.completed)
    ?.sort((a, b) => new Date(a.due_date || Infinity) - new Date(b.due_date || Infinity))
    ?.slice(0, 5) || [];

  // Clientes recentes
  const recentClients = clients
    ?.sort((a, b) => (b.id || 0) - (a.id || 0))
    ?.slice(0, 5) || [];

  // Dados financeiros para o gráfico (exemplo)
  const financialData = {
    receita: 48500,
    despesas: 23120,
    lucro: 25380
  };

  // Dados de faturamento por projeto
  const billingByProject = [
    { id: 1, name: "TechBrand", value: 22500, color: "bg-rose-400" },
    { id: 2, name: "EcoVida", value: 15000, color: "bg-blue-400" },
    { id: 3, name: "FashionNow", value: 7500, color: "bg-indigo-400" },
    { id: 4, name: "Outros", value: 3500, color: "bg-gray-400" }
  ];

  // Formatando a data atual
  const currentDateFormatted = format(new Date(), "MMMM yyyy", { locale: ptBR });
  const capitalizedDate = currentDateFormatted.charAt(0).toUpperCase() + currentDateFormatted.slice(1);
  
  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral da produtora Content Crush</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9">
            {capitalizedDate}
          </Button>
          <Button className="bg-rose-500 hover:bg-rose-600 h-9" onClick={openProjectForm}>
            <PlusIcon className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Projetos Ativos" 
          value={activeProjects} 
          subtitle="de 15 total"
          change={12}
          color="emerald"
        />
        <StatCard 
          title="Tarefas Pendentes" 
          value={pendingTasks} 
          subtitle={`${lateTasksCount} atrasadas`}
          change={-5}
          color="amber"
        />
        <StatCard 
          title="Clientes Ativos" 
          value={activeClientsCount} 
          subtitle={`${newClientsThisMonth} novos este mês`}
          change={8}
          color="blue"
        />
        <StatCard 
          title="Faturamento Mensal" 
          value={`R$ ${(monthlyRevenue / 1000).toFixed(3).replace('.', '.')}`} 
          subtitle={`+15%`}
          change={15}
          color="purple"
        />
      </div>

      {/* Projetos em andamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden border">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="font-semibold">Projetos em Andamento</h2>
            <Button variant="ghost" size="sm" asChild>
              <div className="flex items-center">
                <MoreVertical className="h-4 w-4" />
              </div>
            </Button>
          </div>
          <div className="divide-y">
            {ongoingProjects.map(project => (
              <div key={project.id} className="p-4">
                <div className="flex justify-between mb-1">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.description?.substring(0, 40) || 'Sem descrição'}</p>
                  </div>
                  <StatusBadge status={project.status || 'Em produção'} />
                </div>
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <img 
                    src={clients?.find(c => c.id === project.client_id)?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(clients?.find(c => c.id === project.client_id)?.name || 'Client')}&background=random`}
                    alt={clients?.find(c => c.id === project.client_id)?.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm">{clients?.find(c => c.id === project.client_id)?.name || 'Cliente'}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    Prazo: {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'Não definido'}
                  </span>
                </div>
                <ProgressBar progress={project.progress || 0} />
              </div>
            ))}
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">Ver todos os projetos</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Próximas tarefas */}
        <Card className="overflow-hidden border">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="font-semibold">Tarefas Próximas</h2>
            <Button variant="ghost" size="sm" asChild>
              <div className="flex items-center">
                <MoreVertical className="h-4 w-4" />
              </div>
            </Button>
          </div>
          <div className="divide-y">
            {upcomingTasks.map(task => (
              <div key={task.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Circle className="h-5 w-5 text-gray-300" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{task.title}</h3>
                      <PriorityBadge priority={task.priority || 'Normal'} />
                    </div>
                    {task.due_date && (
                      <p className="text-sm text-gray-500">
                        {new Date(task.due_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks">Ver todas as tarefas</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Visão Financeira e Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visão Financeira */}
        <Card className="overflow-hidden border">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="font-semibold">Visão Financeira</h2>
            <div className="flex border rounded-md">
              <Button 
                variant={viewMode === "semana" ? "default" : "ghost"} 
                size="sm" 
                className={viewMode === "semana" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                onClick={() => setViewMode("semana")}
              >
                Semana
              </Button>
              <Button 
                variant={viewMode === "mes" ? "default" : "ghost"}
                size="sm"
                className={viewMode === "mes" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                onClick={() => setViewMode("mes")}
              >
                Mês
              </Button>
              <Button 
                variant={viewMode === "ano" ? "default" : "ghost"}
                size="sm"
                className={viewMode === "ano" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                onClick={() => setViewMode("ano")}
              >
                Ano
              </Button>
            </div>
          </div>
          <div className="p-4">
            {/* Métricas financeiras */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Receita</p>
                <p className="text-xl font-bold">R$ {(financialData.receita / 1000).toFixed(3).replace('.', '.')}</p>
                <div className="flex items-center text-xs text-emerald-600 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>15% vs. último mês</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Despesas</p>
                <p className="text-xl font-bold">R$ {(financialData.despesas / 1000).toFixed(3).replace('.', '.')}</p>
                <div className="flex items-center text-xs text-rose-600 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>8% vs. último mês</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lucro</p>
                <p className="text-xl font-bold">R$ {(financialData.lucro / 1000).toFixed(3).replace('.', '.')}</p>
                <div className="flex items-center text-xs text-emerald-600 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>22% vs. último mês</span>
                </div>
              </div>
            </div>

            {/* Faturamento por projeto */}
            <p className="font-medium mb-3">Faturamento por Projeto (Abril 2025)</p>
            <div className="space-y-4">
              {billingByProject.map(project => (
                <div key={project.id} className="flex items-center">
                  <div className={`w-full h-7 ${project.color} rounded-md relative flex items-center px-3`}>
                    <span className="text-white text-xs font-medium">{project.name}</span>
                    <span className="text-white text-xs ml-auto">
                      R$ {(project.value / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/financial">Ver relatório financeiro completo</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Clientes Recentes */}
        <Card className="overflow-hidden border">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="font-semibold">Clientes Recentes</h2>
            <Button variant="ghost" size="sm" asChild>
              <div className="flex items-center">
                <MoreVertical className="h-4 w-4" />
              </div>
            </Button>
          </div>
          <div className="divide-y">
            {recentClients.map(client => (
              <div key={client.id} className="p-4 flex items-center">
                <img 
                  src={client.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random`}
                  alt={client.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="ml-3 flex-1">
                  <Link href={`/clients/${client.id}`}>
                    <h3 className="font-medium hover:text-blue-600">{client.name}</h3>
                  </Link>
                  <p className="text-sm text-gray-500">
                    {projects?.filter(p => p.client_id === client.id)?.length || 0} {" "}
                    {projects?.filter(p => p.client_id === client.id)?.length === 1 ? 'projeto ativo' : 'projetos ativos'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/clients/${client.id}`}>
                    <span className="text-blue-600">Ver</span>
                  </Link>
                </Button>
              </div>
            ))}
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clients">Ver todos os clientes</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}