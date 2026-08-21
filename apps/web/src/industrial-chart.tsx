import{useEffect,useRef}from'react';
import*as echarts from'echarts/core';
import{BarChart,LineChart}from'echarts/charts';
import{GridComponent,TooltipComponent,DatasetComponent,VisualMapComponent}from'echarts/components';
import{CanvasRenderer}from'echarts/renderers';
import type{EChartsCoreOption}from'echarts/core';

echarts.use([BarChart,LineChart,GridComponent,TooltipComponent,DatasetComponent,VisualMapComponent,CanvasRenderer]);

export function IndustrialChart({option,label,className='industrial-chart'}:{option:EChartsCoreOption;label:string;className?:string}){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(!ref.current)return;const chart=echarts.init(ref.current,undefined,{renderer:'canvas'});const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;chart.setOption({...option,animation:!reduced,animationDuration:reduced?0:800,animationDurationUpdate:reduced?0:320,animationEasing:'cubicOut'});const observer=new ResizeObserver(()=>chart.resize());observer.observe(ref.current);return()=>{observer.disconnect();chart.dispose()}},[option]);return <div ref={ref} className={className} role="img" aria-label={label}/>}

export const chartTheme={text:'#b9c9c1',muted:'#667a70',grid:'rgba(226,241,234,.09)',mint:'#52d9c2',lime:'#b9f36a',amber:'#f1c56a',bg:'#0a1311'};
