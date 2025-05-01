import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';

interface ResponsiveFinancialChartProps {
  type: 'line' | 'bar' | 'pie';
  title: string;
  description?: string;
  data: any[];
  colors?: string[];
  dataKeys?: string[];
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  height?: number | string;
  className?: string;
  valueFormatter?: (value: number) => string;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  enableGridX?: boolean;
  enableGridY?: boolean;
  isCompact?: boolean;
  noCard?: boolean;
  innerRadius?: number;
  activeInnerRadius?: number;
  theme?: any;
}

// Tema padrão para todos os gráficos
const defaultTheme = {
  axis: {
    ticks: {
      text: {
        fontSize: 12,
        fill: '#64748B'
      }
    },
    legend: {
      text: {
        fontSize: 12,
        fill: '#64748B'
      }
    }
  },
  grid: {
    line: {
      stroke: '#E2E8F0',
      strokeWidth: 1,
      strokeDasharray: '3 3'
    }
  },
  legends: {
    text: {
      fontSize: 12,
      fill: '#334155'
    }
  },
  tooltip: {
    container: {
      backgroundColor: 'white',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
    }
  },
  labels: {
    text: {
      fontSize: 11,
      fill: '#334155'
    }
  }
};

export default function ResponsiveFinancialChart({
  type,
  title,
  description,
  data,
  colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'],
  dataKeys = [],
  xAxisDataKey = 'name',
  yAxisDataKey = 'value',
  height = '100%',
  className = '',
  valueFormatter = (value) => formatCurrency(value),
  legendPosition = 'bottom',
  enableGridX = true,
  enableGridY = true,
  isCompact = false,
  noCard = false,
  innerRadius = 0.6,
  activeInnerRadius = 0.55,
  theme: customTheme
}: ResponsiveFinancialChartProps) {
  
  const theme = useMemo(() => {
    return { ...defaultTheme, ...customTheme };
  }, [customTheme]);

  const responsiveHeight = typeof height === 'number' ? height : height;
  
  // Preparar dados para gráficos de linha
  const lineData = useMemo(() => {
    if (type !== 'line' || !dataKeys?.length) return [];
    
    return dataKeys.map(key => ({
      id: key,
      data: data.map(item => ({
        x: item[xAxisDataKey],
        y: item[key]
      }))
    }));
  }, [type, data, dataKeys, xAxisDataKey]);

  // Renderizar diferentes tipos de gráficos
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <div style={{ height: responsiveHeight, minHeight: isCompact ? 200 : 300 }}>
            <ResponsiveLine
              data={lineData}
              margin={{ 
                top: isCompact ? 10 : 20, 
                right: isCompact ? 30 : 50, 
                bottom: isCompact ? 40 : (legendPosition === 'bottom' ? 60 : 50), 
                left: isCompact ? 40 : (legendPosition === 'left' ? 70 : 50) 
              }}
              xScale={{ type: 'point' }}
              yScale={{ 
                type: 'linear', 
                min: 'auto', 
                max: 'auto'
              }}
              curve="monotoneX"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: isCompact ? -45 : 0,
                legendOffset: 36,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0,
                format: valueFormatter,
                legendOffset: -40,
                legendPosition: 'middle'
              }}
              enableGridX={enableGridX}
              enableGridY={enableGridY}
              colors={colors}
              pointSize={isCompact ? 4 : 8}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              pointLabelYOffset={-12}
              useMesh={true}
              enableArea={true}
              areaOpacity={0.1}
              enableSlices="x"
              theme={theme}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 50,
                  itemsSpacing: 20,
                  itemDirection: 'left-to-right',
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: 'circle',
                  symbolBorderColor: 'rgba(0, 0, 0, .5)'
                }
              ]}
              tooltip={(point) => {
                return (
                  <div style={{ 
                    background: 'white', 
                    padding: '8px 12px', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      fontSize: '12px' 
                    }}>
                      {point.point.data.x}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: point.point.serieColor,
                          borderRadius: '50%',
                          marginRight: '6px'
                        }}
                      />
                      <div>{point.point.serieId}:</div>
                      <div style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                        {valueFormatter(point.point.data.y as number)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        );
      
      case 'bar':
        return (
          <div style={{ height: responsiveHeight, minHeight: isCompact ? 200 : 300 }}>
            <ResponsiveBar
              data={data}
              keys={dataKeys}
              indexBy={xAxisDataKey}
              margin={{ 
                top: isCompact ? 10 : 20, 
                right: isCompact ? 10 : 20, 
                bottom: isCompact ? 40 : (legendPosition === 'bottom' ? 60 : 50), 
                left: isCompact ? 40 : (legendPosition === 'left' ? 70 : 50) 
              }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={colors}
              borderRadius={4}
              borderWidth={0}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: isCompact ? -45 : 0,
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0,
                format: valueFormatter,
                legendPosition: 'middle',
                legendOffset: -40
              }}
              enableGridX={enableGridX}
              enableGridY={enableGridY}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              theme={theme}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 50,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 12,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              tooltip={(bar) => {
                return (
                  <div style={{ 
                    background: 'white', 
                    padding: '8px 12px', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      fontSize: '12px' 
                    }}>
                      {bar.indexValue}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: bar.color,
                          borderRadius: '50%',
                          marginRight: '6px'
                        }}
                      />
                      <div>{bar.id}:</div>
                      <div style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                        {valueFormatter(bar.value)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        );
      
      case 'pie':
        return (
          <div style={{ height: responsiveHeight, minHeight: isCompact ? 200 : 300 }}>
            <ResponsivePie
              data={data.map(item => ({
                id: item[xAxisDataKey],
                label: item[xAxisDataKey],
                value: item[yAxisDataKey],
                color: colors[data.indexOf(item) % colors.length]
              }))}
              margin={{ 
                top: isCompact ? 10 : 20, 
                right: isCompact ? 10 : 20, 
                bottom: isCompact ? 40 : (legendPosition === 'bottom' ? 60 : 50), 
                left: isCompact ? 10 : 20 
              }}
              innerRadius={innerRadius}
              activeInnerRadiusOffset={8}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={colors}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              arcLinkLabelsSkipAngle={isCompact ? 15 : 10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={isCompact ? 15 : 10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              theme={theme}
              legends={legendPosition === 'none' ? [] : [
                {
                  anchor: legendPosition as any,
                  direction: legendPosition === 'bottom' || legendPosition === 'top' ? 'row' : 'column',
                  justify: false,
                  translateX: legendPosition === 'right' ? 20 : 0,
                  translateY: legendPosition === 'bottom' ? 40 : 0,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 20,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 12,
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
              tooltip={({ datum }) => {
                return (
                  <div style={{ 
                    background: 'white', 
                    padding: '8px 12px', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: datum.color,
                          borderRadius: '50%',
                          marginRight: '6px'
                        }}
                      />
                      <div style={{ fontWeight: 'bold' }}>{datum.label}:</div>
                      <div style={{ marginLeft: '4px' }}>
                        {valueFormatter(datum.value)}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', color: '#64748B' }}>
                      {datum.formattedValue}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        );
      
      default:
        return <div>Chart type not supported</div>;
    }
  };

  if (noCard) {
    return renderChart();
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}