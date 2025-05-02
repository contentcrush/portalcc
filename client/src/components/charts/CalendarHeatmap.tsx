import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveCalendar } from '@nivo/calendar';
import { subMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarHeatmapProps {
  title: string;
  data: Array<{ day: string; value: number }>;
  from?: string; // ISO string
  to?: string; // ISO string
  emptyColor?: string;
  colors?: string[];
  dayBorderWidth?: number;
  dayBorderColor?: string;
  daySpacing?: number;
  height?: number;
  legend?: string;
}

export default function CalendarHeatmap({
  title,
  data,
  from,
  to,
  emptyColor = "#f5f5f5",
  colors = ['#e6f2ff', '#8bbee8', '#5c8eb8', '#337ab7', '#0d4d7a'],
  dayBorderWidth = 1,
  dayBorderColor = "#ffffff",
  daySpacing = 3,
  height = 200,
  legend = "Atividades"
}: CalendarHeatmapProps) {
  // Default to 6 months ago from today
  const defaultFrom = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveCalendar
            data={data}
            from={from || defaultFrom}
            to={to || defaultTo}
            emptyColor={emptyColor}
            colors={colors}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            yearSpacing={40}
            monthBorderColor="#ffffff"
            dayBorderWidth={dayBorderWidth}
            dayBorderColor={dayBorderColor}
            daySpacing={daySpacing}
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'row',
                translateY: 36,
                itemCount: 4,
                itemWidth: 42,
                itemHeight: 36,
                itemsSpacing: 14,
                itemDirection: 'right-to-left'
              }
            ]}
            tooltip={({ day, value, color }) => (
              <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
                <p className="text-xs font-medium mb-1">{format(parseISO(day), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p className="flex items-center text-xs">
                  <span className="mr-1">{legend}:</span>
                  <span className="font-medium">{value}</span>
                </p>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}