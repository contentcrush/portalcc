import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveBar } from '@nivo/bar';
import { formatCurrency } from "@/lib/utils";

interface BarChartProps {
  title: string;
  data: any[];
  indexBy: string;
  keys: string[];
  height?: number;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  groupMode?: 'grouped' | 'stacked';
  layout?: 'horizontal' | 'vertical';
  enableLabel?: boolean;
  labelSkipWidth?: number;
  labelSkipHeight?: number;
  padding?: number;
  innerPadding?: number;
  borderRadius?: number;
  borderWidth?: number;
  colorBy?: 'id' | 'indexValue';
  enableGridX?: boolean;
  enableGridY?: boolean;
  legendBottom?: string;
  legendLeft?: string;
  showLegend?: boolean;
}

export default function BarChart({
  title,
  data,
  indexBy,
  keys,
  height = 300,
  colors = ['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B'],
  valueFormatter = formatCurrency,
  groupMode = 'stacked',
  layout = 'vertical',
  enableLabel = false,
  labelSkipWidth = 12,
  labelSkipHeight = 12,
  padding = 0.3,
  innerPadding = 2,
  borderRadius = 4,
  borderWidth = 0,
  colorBy = 'id',
  enableGridX = layout === 'horizontal',
  enableGridY = layout === 'vertical',
  legendBottom = '',
  legendLeft = '',
  showLegend = true
}: BarChartProps) {
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveBar
            data={data}
            keys={keys}
            indexBy={indexBy}
            margin={{ 
              top: 20, 
              right: 20, 
              bottom: legendBottom ? 50 : 30, 
              left: legendLeft ? 70 : 50 
            }}
            padding={padding}
            innerPadding={innerPadding}
            groupMode={groupMode}
            layout={layout}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={colors}
            colorBy={colorBy}
            borderRadius={borderRadius}
            borderWidth={borderWidth}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: legendBottom,
              legendPosition: 'middle',
              legendOffset: 36
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: legendLeft,
              legendPosition: 'middle',
              legendOffset: -50,
              format: layout === 'horizontal' ? valueFormatter : undefined
            }}
            enableLabel={enableLabel}
            labelSkipWidth={labelSkipWidth}
            labelSkipHeight={labelSkipHeight}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            enableGridX={enableGridX}
            enableGridY={enableGridY}
            legends={
              showLegend ? 
              [
                {
                  dataFrom: 'keys',
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 40,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ] : []
            }
            tooltip={({ id, value, color, indexValue }) => (
              <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
                <p className="text-xs font-medium mb-1">{indexValue}</p>
                <div className="flex items-center text-xs">
                  <div 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="mr-1">{id}:</span>
                  <span className="font-medium">{valueFormatter(value)}</span>
                </div>
              </div>
            )}
            role="application"
            ariaLabel="Bar chart"
          />
        </div>
      </CardContent>
    </Card>
  );
}