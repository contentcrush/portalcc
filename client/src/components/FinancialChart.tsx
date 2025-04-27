import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { MONTHS } from "@/lib/constants";

interface FinancialChartProps {
  type: 'area' | 'bar' | 'pie';
  title: string;
  data: any[];
  colors?: string[];
  dataKeys: string[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number) => string;
  xAxisDataKey?: string;
  valueFormatter?: (value: number) => string;
}

export default function FinancialChart({
  type,
  title,
  data,
  colors = ['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B'],
  dataKeys,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  showTooltip = true,
  tooltipFormatter = (value) => formatCurrency(value),
  xAxisDataKey = 'name',
  valueFormatter = (value) => formatCurrency(value)
}: FinancialChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    setChartData(data);
  }, [data]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div 
              key={`tooltip-${index}`} 
              className="flex items-center text-xs mb-1"
            >
              <div 
                className="w-2 h-2 rounded-full mr-1" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="mr-1">{entry.name}:</span>
              <span className="font-medium">{tooltipFormatter(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
              <XAxis 
                dataKey={xAxisDataKey} 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tickFormatter={valueFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.2}
                  stackId={stacked ? "1" : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
              <XAxis 
                dataKey={xAxisDataKey} 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tickFormatter={valueFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  stackId={stacked ? "1" : undefined}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                dataKey={dataKeys[0]}
                nameKey={xAxisDataKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <Tooltip formatter={tooltipFormatter} />}
              {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
