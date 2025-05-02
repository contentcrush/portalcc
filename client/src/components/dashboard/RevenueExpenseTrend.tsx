import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { subMonths, format, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface MonthData {
  name: string;
  month: Date;
  receita: number;
  despesas: number;
  meta?: number;
}

export function RevenueExpenseTrend() {
  const { data: financialDocuments = [] } = useQuery({ queryKey: ['/api/financial-documents'] });
  const { data: expenses = [] } = useQuery({ queryKey: ['/api/expenses'] });

  // Generate last 12 months data
  const generateMonthlyData = (): MonthData[] => {
    const today = new Date();
    const data: MonthData[] = [];

    // Generate the last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Calculate revenue for this month
      const monthRevenue = financialDocuments
        .filter(doc => {
          const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
          return docDate && isAfter(docDate, monthStart) && isBefore(docDate, monthEnd);
        })
        .reduce((sum, doc) => sum + (doc.amount || 0), 0);
      
      // Calculate expenses for this month
      const monthExpenses = expenses
        .filter(exp => {
          const expDate = exp.date ? new Date(exp.date) : null;
          return expDate && isAfter(expDate, monthStart) && isBefore(expDate, monthEnd);
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      // Add a meta value that increases each month (dynamic goal line)
      const meta = 20000 + (i * 2000); // Exemplo simples para demonstração
      
      data.push({
        name: format(monthDate, 'MMM', { locale: ptBR }),
        month: monthDate,
        receita: monthRevenue,
        despesas: monthExpenses,
        meta
      });
    }

    return data;
  };

  const monthlyData = generateMonthlyData();

  // Check for negative cash flows
  const negativeMonths = monthlyData.filter(month => month.receita < month.despesas);
  const hasNegativeCashFlow = negativeMonths.length > 0;

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-bold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value as number)}
            </p>
          ))}
          {payload[0] && payload[1] && (
            <p className={`font-semibold mt-1 ${payload[0].value > payload[1].value ? 'text-green-600' : 'text-red-600'}`}>
              Saldo: {formatCurrency((payload[0].value as number) - (payload[1].value as number))}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardCard title="Gráfico de tendência">
      <div className="mt-2 h-72">
        {hasNegativeCashFlow && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fluxo de caixa negativo detectado</AlertTitle>
            <AlertDescription>
              Existem {negativeMonths.length} meses com fluxo de caixa negativo no último ano.
            </AlertDescription>
          </Alert>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthlyData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              fontSize={11}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receita" 
              stroke="#16a34a" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="Receita"
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Despesas"
            />
            <Line 
              type="monotone" 
              dataKey="meta" 
              stroke="#6366f1" 
              strokeDasharray="5 5"
              strokeWidth={1.5}
              name="Meta"
            />
            <ReferenceLine y={0} stroke="#666" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}