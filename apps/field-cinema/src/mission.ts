export const DURATION = 192;
export const chapters = [
 {at:0,title:'Un campo conectado',short:'Ecosistema',body:'Observación aérea, presencia fija e inspección terrestre en una misma misión.'},
 {at:12,title:'La estación se despliega',short:'Despliegue',body:'El mástil eleva la bahía de la estación. La bahía se abre y prepara la salida del dron.'},
 {at:28,title:'Una nueva perspectiva',short:'Vuelo',body:'El dron recorre la parcela. Cada tramo amplía la superficie observada.'},
 {at:57,title:'La señal toma forma',short:'Vegetación',body:'El mapa revela una desviación localizada. Selecciona una celda para examinar su valor.'},
 {at:72,title:'WALL‑AI amplía la inspección',short:'WALL‑AI',body:'WALL-AI despliega su dron a mayor altura y cartografía únicamente su entorno con RGB y térmica simulada.'},
 {at:94,title:'La tierra aporta contexto',short:'Muestra',body:'La sonda se despliega y añade una lectura de suelo a la observación aérea.'},
 {at:110,title:'Recorrido hacia el segundo punto',short:'Ruta 2',body:'WALL-AI circula por el pasillo de servicio y entra en otra calle del viñedo.'},
 {at:126,title:'Segunda muestra de suelo',short:'Sonda 2',body:'El robot se detiene, introduce la sonda y registra siete parámetros en un segundo punto.'},
 {at:142,title:'Una tercera zona de la parcela',short:'Ruta 3',body:'La cámara acompaña a WALL-AI por el pasillo transversal hasta la siguiente zona.'},
 {at:160,title:'Tercera muestra de suelo',short:'Sonda 3',body:'Nueva inserción y lectura INSECE. Cada muestra conserva su posición y su instante.'},
 {at:176,title:'Regreso por el viñedo',short:'Regreso',body:'Sonda recogida y dron alojado. WALL-AI vuelve por las calles de servicio.'},
 {at:192,title:'De la señal a la evidencia',short:'Resultado',body:'Tres muestras de suelo, observación aérea y registro visual reunidos para revisión.'},
] as const;
export type ViewMode='mission'|'rover'|'sentinel';
export type CameraMode='auto'|'overview'|'drone'|'rover'|'sentinel'|'anomaly'|'local'|'probe'|'sensors'|'aircraft';
export const clamp=(n:number,a=0,b=1)=>Math.min(b,Math.max(a,n));
export const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)};
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export function phaseIndex(t:number){let i=0;for(let k=0;k<chapters.length;k++)if(t>=chapters[k].at)i=k;return i}
export const GRID={cols:60,rows:42,width:30,depth:21,x:-3,z:0};
export const ROVER_SCALE=.6;
export const ANOMALY={x:3.2,z:1.6};
export function normalizedDifference(red:number,nir:number){return red>=0&&nir>=0&&red+nir>1e-8?(nir-red)/(nir+red):null}
export function bandsAt(x:number,z:number){
 const rowDistance=Math.abs(((z+43.2+1.4)%2.8+2.8)%2.8-1.4);
 const canopy=Math.abs(x+14)>1.65&&rowDistance<.55&&Math.abs(z-1.6)>1.1&&!(x>7&&x<12&&z>-8&&z<-2);
 const weed=x*x+(z-.2)**2<.4;
 const vigor=clamp(.76+.035*Math.sin(x*.57)+.025*Math.cos(z*.8)-.42*Math.exp(-((x-ANOMALY.x)**2/8+(z-ANOMALY.z-2.8)**2/8))-.55*Math.exp(-((x-6.6)**2+(z-4.4)**2)/.6),.1,.9);
 const target=canopy?vigor:weed?.68:.14+.035*Math.sin(x*1.3+z*.9);
 const nir=canopy||weed?.46+.035*Math.sin(x*.41+z*.7):.29+.02*Math.cos(x+z);
 return {red:nir*(1-target)/(1+target),nir,canopy};
}
export function ndviAt(x:number,z:number){const b=bandsAt(x,z);return normalizedDifference(b.red,b.nir)!}
export const cells=Array.from({length:GRID.cols*GRID.rows},(_,index)=>{const col=index%GRID.cols,row=Math.floor(index/GRID.cols),x=GRID.x-GRID.width/2+(col+.5)*GRID.width/GRID.cols,z=GRID.z-GRID.depth/2+(row+.5)*GRID.depth/GRID.rows;const bands=bandsAt(x,z);return{index,col,row,x,z,...bands,value:normalizedDifference(bands.red,bands.nir)!}});
export function summarize(values:number[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const quantile=(p:number)=>{const pos=(sorted.length-1)*p,i=Math.floor(pos);return lerp(sorted[i],sorted[Math.min(i+1,sorted.length-1)],pos-i)};const bins=Array.from({length:10},(_,i)=>({min:-1+i*.2,max:-.8+i*.2,count:0}));for(const v of values)bins[Math.min(9,Math.max(0,Math.floor((v+1)/.2)))].count++;return{mean:values.reduce((a,b)=>a+b,0)/values.length,median:quantile(.5),p10:quantile(.1),p90:quantile(.9),bins,count:values.length,low:values.filter(x=>x<.45).length}}
export const statistics=summarize(cells.map(c=>c.value))!;
export const canopyStatistics=summarize(cells.filter(c=>c.canopy).map(c=>c.value))!;
export function colorFor(v:number){const stops=[[-1,[141,78,62]],[0,[200,145,65]],[.35,[214,185,72]],[.55,[145,169,77]],[.72,[58,119,68]],[1,[24,77,53]]] as const;for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const [a,ca]=stops[i-1],[b,cb]=stops[i];return ca.map((c,k)=>Math.round(lerp(c,cb[k],clamp((v-a)/(b-a))))) as [number,number,number]}return [24,77,53] as [number,number,number]}
export const flightPath:[number,number,number][]=[[9,6,-5],[8,10,-5],[7,10,-8],[-16,10,-8],[-16,10,-4],[7,10,-4],[7,10,0],[-16,10,0],[-16,10,4],[7,10,4],[7,10,8],[-16,10,8],[9,10,-5],[9,6,-5]];
export const roverPath:[number,number,number][]=[[-8,0,1.6],[-4,0,1.6],[0,0,1.6],[ANOMALY.x-1.43*ROVER_SCALE,0,1.6]];
export function pathAt(path:[number,number,number][],p:number):[number,number,number]{const f=clamp(p)*(path.length-1),i=Math.min(path.length-2,Math.floor(f)),a=path[i],b=path[i+1],v=f-i;return[lerp(a[0],b[0],v),lerp(a[1],b[1],v),lerp(a[2],b[2],v)]}
export type BayState={door:number;platform:number;air:number;survey:number;status:string};
// Ordered interlocks: open, extend, launch, inspect, land, retract, close.
export function bayCycle(p:number):BayState{
 p=clamp(p);const door=smooth(p/.16)*(1-smooth((p-.90)/.10));
 const platform=smooth((p-.16)/.14)*(1-smooth((p-.77)/.13));
 const air=smooth((p-.34)/.10)*(1-smooth((p-.64)/.10));
 return {door,platform,air,survey:clamp((p-.44)/.20),status:p===0||p===1?'Alojado':p<.16?'Abriendo puerta':p<.30?'Liberando plataforma':p<.34?'Preparado':p<.44?'Despegue':p<.64?'Observación':p<.74?'Aterrizaje':p<.90?'Recogiendo plataforma':'Cerrando puerta'};
}
export function stationCycle(raw:number):BayState&{lift:number}{const p=clamp(raw);return {door:smooth(p/.16)*(1-smooth((p-.94)/.06)),platform:smooth((p-.16)/.14)*(1-smooth((p-.84)/.10)),lift:smooth((p-.30)/.10)*(1-smooth((p-.76)/.08)),air:smooth((p-.42)/.08)*(1-smooth((p-.66)/.08)),survey:clamp((p-.50)/.16),status:p===0||p===1?'Alojado':p<.16?'Abriendo puerta':p<.30?'Extendiendo cajón':p<.40?'Elevando tijera':p<.42?'Plataforma a nivel de caja':p<.50?'Despegue':p<.66?'Observación':p<.74?'Aterrizaje':p<.76?'Dron apoyado':p<.84?'Bajando tijera':p<.94?'Recogiendo cajón':'Cerrando puerta'}}
export const sampleStops=[{id:'S-01',start:94,x:ANOMALY.x-1.43*ROVER_SCALE,z:1.6},{id:'S-02',start:126,x:-7,z:-5.4},{id:'S-03',start:160,x:-3,z:8.6}];
const route2:[number,number,number][]=[[sampleStops[0].x,0,1.6],[-14,0,1.6],[-14,0,-5.4],[-7,0,-5.4]];
const route3:[number,number,number][]=[[-7,0,-5.4],[-14,0,-5.4],[-14,0,8.6],[-3,0,8.6]];
const returnRoute:[number,number,number][]=[[-3,0,8.6],[-14,0,8.6],[-14,0,1.6],[-8,0,1.6]];
export function roverJourney(t:number){let route=roverPath,start=72,duration=8;if(t>=176){route=returnRoute;start=176;duration=16}else if(t>=142){route=route3;start=142;duration=18}else if(t>=110){route=route2;start=110;duration=16}const p=smooth((t-start)/duration),position=pathAt(route,p),a=pathAt(route,clamp(p-.002)),b=pathAt(route,clamp(p+.002));const yaw=Math.atan2(-(b[0]-a[0]),-(b[2]-a[2]));const f=p*(route.length-1),segment=Math.min(route.length-2,Math.floor(f));let travelled=0;for(let k=0;k<=segment;k++){const a=route[k],b=route[k+1];travelled+=Math.hypot(b[0]-a[0],b[2]-a[2])*(k===segment?f-segment:1)}return {position,travelled,yaw:Math.abs(b[0]-a[0])+Math.abs(b[2]-a[2])<1e-8?-Math.PI/2:yaw,moving:t>start&&t<start+duration}}
export function sampleAt(t:number){const index=t>=160?2:t>=126?1:0,stop=sampleStops[index],localTime=t-stop.start+94;return {index,stop,localTime,active:t>=stop.start&&t<stop.start+16}}
export function missionAt(raw:number){const t=clamp(raw,0,DURATION),coverage=clamp((t-33)/24),flight=clamp((t-30)/42),journey=roverJourney(t),rover=journey.position,inspection=sampleAt(t),st=inspection.localTime;
 const stationBay:BayState&{lift:number}={door:smooth((t-22)/3)*(1-smooth((t-77)/3)),platform:smooth((t-25)/3)*(1-smooth((t-74)/3)),lift:smooth((t-28)/2)*(1-smooth((t-72)/2)),air:smooth((t-30)/3)*(1-smooth((t-69)/3)),survey:clamp((t-33)/36),status:t<22||t>=80?'Alojado':t<25?'Abriendo puerta':t<28?'Extendiendo cajón':t<30?'Elevando tijera':t<33?'Despegue':t<69?'Cartografía':t<72?'Aterrizaje':t<74?'Bajando tijera':t<77?'Recogiendo cajón':'Cerrando puerta'};
 return{t,phase:phaseIndex(t),coverage,rover,roverYaw:journey.yaw,travelled:journey.travelled,moving:journey.moving,sampling:inspection.active,sampleIndex:inspection.index,drone:t<33?[9,10,-6.85] as [number,number,number]:t<=57?pathAt([[9,10,-6.85],...flightPath.slice(2,-2)],(t-33)/24):pathAt([flightPath[flightPath.length-3],[9,10,-6.85]],(t-57)/12),stationBay,roverBay:bayCycle((t-80)/16),mast:smooth((t-12)/10),bay:stationBay.door,probe:inspection.active?smooth((st-96)/4)*(1-smooth((st-106)/4)):0,sample:t>=103,ndvi:t>=57,report:t>=DURATION,droneBattery:98-26*flight,roverBattery:96-6*clamp((t-72)/38)}}
export function telemetryUntil(t:number){return Array.from({length:Math.floor(clamp(t,0,DURATION))+1},(_,s)=>{const m=missionAt(s);return [s,m.droneBattery,m.roverBattery,m.coverage*100]})}
export function csvReport(){return ['classification,column,row,local_x_m,local_z_m,red_reflectance_synthetic,nir_reflectance_synthetic,canopy_mask,ndvi',...cells.map(c=>`SYNTHETIC,${c.col},${c.row},${c.x.toFixed(2)},${c.z.toFixed(2)},${c.red.toFixed(6)},${c.nir.toFixed(6)},${c.canopy?1:0},${c.value.toFixed(6)}`)].join('\n')}
