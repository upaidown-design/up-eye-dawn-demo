import {z} from 'zod';
export const Classification=z.enum(['REAL','REUSED','DERIVED','SIMULATED','SYNTHETIC','CONCEPT']);
export const DemoAction=z.enum(['PLAY','PAUSE','RESUME','RESET','SEEK','SET_SPEED','SKIP_TO_PHASE','REPLAY']);
export const EventEnvelope=z.object({eventId:z.string(),eventType:z.string(),eventVersion:z.literal(1),sequence:z.number().int().nonnegative(),runId:z.string(),scenarioId:z.string(),source:z.string(),correlationId:z.string(),causationId:z.string(),recordedAt:z.string(),simulationTime:z.number().nonnegative(),classification:Classification,payload:z.record(z.string(),z.unknown())});
export type DomainEvent=z.infer<typeof EventEnvelope>;
export const Scenario=z.object({id:z.string(),version:z.number().int().positive(),seed:z.number().int(),title:z.string(),durationSeconds:z.number().positive(),farmId:z.string(),phases:z.array(z.object({id:z.string(),label:z.string(),start:z.number().nonnegative(),end:z.number().positive()})),expectedEvents:z.array(z.string())});
export type Scenario=z.infer<typeof Scenario>;
export type ActorSnapshot={id:string;type:'mast'|'drone'|'rover'|'probe'|'analytics';state:string;position:[number,number];battery:number;telemetry:Record<string,number|string|boolean>};
export type SimulationSnapshot={runId:string;scenarioId:string;sequence:number;simulationTime:number;speed:number;status:'READY'|'RUNNING'|'PAUSED'|'COMPLETED';phase:string;actors:ActorSnapshot[];coverage:number;ndviReady:boolean;anomalyReady:boolean;reportReady:boolean};
