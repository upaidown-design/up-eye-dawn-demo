import {clamp,missionAt,sampleAt,sampleStops} from './mission';
// Field names confirmed by the user against INSECE. Values are demonstration fixtures.
export const soilChannels=[
 {key:'moisturePercent',label:'Humedad',unit:'%',value:28.4,digits:1,color:'#57c8f6'},
 {key:'temperatureC',label:'Temperatura',unit:'°C',value:21.7,digits:1,color:'#eeac71'},
 {key:'ph',label:'pH',unit:'',value:6.7,digits:1,color:'#ba9bea'},
 {key:'ecDsM',label:'Conductividad',unit:'dS/m',value:1.31,digits:2,color:'#66d1c4'},
 {key:'nitrogenMgKg',label:'N · Nitrógeno',unit:'mg/kg',value:42,digits:0,color:'#8fcb92'},
 {key:'phosphorusMgKg',label:'P · Fósforo',unit:'mg/kg',value:18,digits:0,color:'#e6c778'},
 {key:'potassiumMgKg',label:'K · Potasio',unit:'mg/kg',value:156,digits:0,color:'#f09b98'},
] as const;
export function soilAt(missionTime:number){const sample=sampleAt(missionTime),time=sample.localTime,m=missionAt(missionTime),contact=time>=98.2,available=time>=100,complete=time>=103,progress=clamp((time-100)/3),sampleTime=Math.floor(Math.min(time,103)*4)/4;return {id:sample.stop.id,contact,available,complete,progress,depthCm:Math.max(0,(m.probe*.48-.155)*.6-.06)*100,status:time<96?'Posicionando':time<98.2?'Descendiendo':time<100?'Contacto · insertando':time<103?'Adquiriendo · estabilizando':time<106?'Muestra registrada':time<110?'Retirando sonda':'Finalizada',readings:soilChannels.map((base,i)=>{const c={...base,value:base.value*([1,.91,1.07][sample.index])};return {...c,current:!available?null:complete?c.value:c.value+(1-progress)*Math.sin(sampleTime*2.7+i*.8)*Math.max(.12,c.value*.045)}})}}
export function soilPayload(){return {classification:'SYNTHETIC',...Object.fromEntries(soilChannels.map(c=>[c.key,c.value]))}}
export function soilSamples(time:number){return sampleStops.filter(s=>time>=s.start+9).map(s=>({id:s.id,time:s.start+9,position:{x:s.x+1.43*.6,z:s.z},classification:'SYNTHETIC',values:Object.fromEntries(soilAt(s.start+9).readings.map(r=>[r.key,r.current]))}))}
