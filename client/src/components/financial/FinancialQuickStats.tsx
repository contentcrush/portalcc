import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Calendar,
  DollarSign,
  Clock
} from "lucide-react";

interface FinancialQuickStatsProps {
  type: "receivables" | "payables";
  stats: {
    total: number;
    overdue: number;
    next7Days: number;
    next30Days: number;
    overdueCount: number;
    next7DaysCount: number;
  };
  formatCurrency: (value: number) => string;
}

export function FinancialQuickStats({ type, stats, formatCurrency }: FinancialQuickStatsProps) {
  const isReceivables = type === "receivables";
  
  const quickStats = [
    {
      title: isReceivables ? "Total a Receber" : "Total a Pagar",
      value: formatCurrency(stats.total),
      icon: <DollarSign className="h-5 w-5" />,
      color: isReceivables ? "text-green-600" : "text-red-600",
      bgColor: isReceivables ? "bg-green-50" : "bg-red-50"
    },
    {
      title: "Vencidas",
      value: formatCurrency(stats.overdue),
      count: `${stats.overdueCount} item${stats.overdueCount !== 1 ? 's' : ''}`,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Próximos 7 dias",
      value: formatCurrency(stats.next7Days),
      count: `${stats.next7DaysCount} item${stats.next7DaysCount !== 1 ? 's' : ''}`,
      icon: <Clock className="h-5 w-5" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Próximos 30 dias",
      value: formatCurrency(stats.next30Days),
      icon: <Calendar className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {quickStats.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.count && (
                  <p className="text-xs text-muted-foreground">
                    {stat.count}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}