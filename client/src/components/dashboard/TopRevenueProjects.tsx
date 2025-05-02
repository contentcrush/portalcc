import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  TooltipProps
} from "recharts";

export function TopRevenueProjects() {
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });
  const { data: clients = [] } = useQuery({ queryKey: ['/api/clients'] });

  // Get projects with budgets, sort by budget (descending), and take top 5
  const topProjects = [...projects]
    .filter(project => project.budget && project.budget > 0)
    .sort((a, b) => (b.budget || 0) - (a.budget || 0))
    .slice(0, 5)
    .map(project => {
      const client = clients.find(c => c.id === project.client_id);
      return {
        id: project.id,
        name: project.name,
        clientName: client?.name || 'Cliente não especificado',
        value: project.budget || 0
      };
    });

  // Generate bar colors
  const COLORS = ['#16A34A', '#65A30D', '#0D9488', '#0284C7', '#7C3AED'];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const project = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-bold">{project.name}</p>
          <p className="text-sm text-muted-foreground">{project.clientName}</p>
          <p className="font-semibold mt-1">{formatCurrency(project.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardCard 
      title="Receita por projeto" 
      description="Top 5 jobs do período selecionado"
      headerAction={
        <Link href="/projects?sort=budget">
          <Button variant="ghost" size="sm">Ver todos</Button>
        </Link>
      }
    >
      <div className="mt-4 h-[300px]">
        {topProjects.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topProjects}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
                fontSize={11}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 13)}...` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                nameKey="name"
                background={{ fill: '#f3f4f6' }}
                radius={[0, 4, 4, 0]}
              >
                {topProjects.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Não há projetos com orçamento para exibir</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}