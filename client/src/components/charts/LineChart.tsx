import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveLine } from '@nivo/line';
import { formatCurrency } from "@/lib/utils";

interface LineChartProps {
  title: string;
  data: Array<{
    id: string;
    color?: string;
    data: Array<{ x: string | number; y: number }>
  }>;
  height?: number;
  colors?: string[];
  xScale?: {
    type: 'point' | 'linear' | 'time';
  };
  yScale?: {
    type: 'linear';
    min?: 'auto' | number;
    max?: 'auto' | number;
  };
  enableArea?: boolean;
  areaOpacity?: number;
  enablePoints?: boolean;
  pointSize?: number;
  pointBorderWidth?: number;
  pointBorderColor?: string;
  enableGridX?: boolean;
  enableGridY?: boolean;
  valueFormatter?: (value: number) => string;
  xLegend?: string;
  yLegend?: string;
  curve?: 'linear' | 'monotoneX' | 'step' | 'stepAfter' | 'stepBefore';
}

export default function LineChart({
  title,
  data,
  height = 300,
  colors = ['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B'],
  xScale = { type: 'point' },
  yScale = { type: 'linear', min: 'auto', max: 'auto' },
  enableArea = true,
  areaOpacity = 0.15,
  enablePoints = true,
  pointSize = 6,
  pointBorderWidth = 2,
  pointBorderColor = '#ffffff',
  enableGridX = false,
  enableGridY = true,
  valueFormatter = formatCurrency,
  xLegend = '',
  yLegend = '',
  curve = 'monotoneX'
}: LineChartProps) {
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveLine
            data={data}
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            xScale={xScale}
            yScale={yScale}
            curve={curve}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: xLegend,
              legendOffset: 36,
              legendPosition: 'middle'
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: yLegend,
              legendOffset: -50,
              legendPosition: 'middle',
              format: (value) => valueFormatter(value)
            }}
            enableGridX={enableGridX}
            enableGridY={enableGridY}
            colors={colors}
            pointSize={pointSize}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={pointBorderWidth}
            pointBorderColor={pointBorderColor}
            pointLabelYOffset={-12}
            enableArea={enableArea}
            areaOpacity={areaOpacity}
            enablePoints={enablePoints}
            useMesh={true}
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 40,
                itemsSpacing: 0,
                itemDirection: 'left-to-right',
                itemWidth: 80,
                itemHeight: 20,
                itemOpacity: 0.75,
                symbolSize: 12,
                symbolShape: 'circle',
                symbolBorderColor: 'rgba(0, 0, 0, .5)',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemBackground: 'rgba(0, 0, 0, .03)',
                      itemOpacity: 1
                    }
                  }
                ]
              }
            ]}
            tooltip={({ point }) => (
              <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
                <p className="text-xs font-medium mb-1">{point.serieId}</p>
                <p className="flex items-center text-xs">
                  <span className="mr-1">{point.data.xFormatted}:</span>
                  <span className="font-medium">{valueFormatter(point.data.y as number)}</span>
                </p>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}