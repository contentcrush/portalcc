import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsivePie } from '@nivo/pie';
import { formatCurrency } from "@/lib/utils";

interface PieChartProps {
  title: string;
  data: Array<{
    id: string;
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  colors?: string[];
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  sortByValue?: boolean;
  valueFormatter?: (value: number) => string;
  legendPosition?: 'bottom' | 'right';
  enableArcLabels?: boolean;
  enableArcLinkLabels?: boolean;
  arcLinkLabelsColor?: string;
  arcLinkLabelsThickness?: number;
}

export default function PieChart({
  title,
  data,
  height = 300,
  colors = ['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B'],
  innerRadius = 0.5,
  padAngle = 0.7,
  cornerRadius = 3,
  sortByValue = false,
  valueFormatter = formatCurrency,
  legendPosition = 'right',
  enableArcLabels = false,
  enableArcLinkLabels = true,
  arcLinkLabelsColor = { from: 'color' },
  arcLinkLabelsThickness = 2,
}: PieChartProps) {
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsivePie
            data={data}
            colors={colors}
            margin={
              legendPosition === 'right' 
                ? { top: 10, right: 120, bottom: 10, left: 10 } 
                : { top: 10, right: 10, bottom: 70, left: 10 }
            }
            innerRadius={innerRadius}
            padAngle={padAngle}
            cornerRadius={cornerRadius}
            activeOuterRadiusOffset={8}
            sortByValue={sortByValue}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            enableArcLabels={enableArcLabels}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            enableArcLinkLabels={enableArcLinkLabels}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsColor={arcLinkLabelsColor}
            arcLinkLabelsThickness={arcLinkLabelsThickness}
            arcLinkLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            legends={[
              {
                anchor: legendPosition === 'right' ? 'right' : 'bottom',
                direction: legendPosition === 'right' ? 'column' : 'row',
                justify: false,
                translateX: legendPosition === 'right' ? 100 : 0,
                translateY: legendPosition === 'right' ? 0 : 56,
                itemsSpacing: 0,
                itemWidth: 100,
                itemHeight: 18,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 18,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemTextColor: '#000'
                    }
                  }
                ]
              }
            ]}
            tooltip={({ datum }) => (
              <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
                <p className="text-xs font-medium mb-1">{datum.label}</p>
                <p className="flex items-center text-xs">
                  <span className="font-medium">{valueFormatter(datum.value)}</span>
                </p>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}