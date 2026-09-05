import {Canvas,useFrame} from '@react-three/fiber';
import {Float,Sparkles} from '@react-three/drei';
import {useRef} from 'react';
import * as THREE from 'three';

const INVESTORS='https://upaidown.pro/demo/access';
const CLIENTS='https://upaidown.app/clients';

function DigitalField(){
 const rig=useRef<THREE.Group>(null); const rover=useRef<THREE.Group>(null);
 useFrame(({clock})=>{if(rig.current)rig.current.rotation.y=Math.sin(clock.elapsedTime*.12)*.09;if(rover.current)rover.current.position.x=-1.5+Math.sin(clock.elapsedTime*.2)*.35});
 return <>
  <color attach="background" args={['#06100f']}/><fog attach="fog" args={['#06100f',7,18]}/>
  <ambientLight intensity={.55}/><directionalLight position={[3,5,4]} intensity={2.4} color="#e7fff8"/><pointLight position={[-4,1,2]} intensity={12} distance={10} color="#3ee3d0"/>
  <group ref={rig} rotation={[-.08,-.35,0]}>{Array.from({length:15},(_,i)=><mesh key={i} position={[(i-7)*.72,-1.45,0]} rotation={[0,0,.05*(i-7)]}><boxGeometry args={[.055,.055,13]}/><meshStandardMaterial color={i%3===0?'#48e8d5':'#163b36'} emissive="#087d70" emissiveIntensity={i%3===0?.7:.08}/></mesh>)}</group>
  <group ref={rover} position={[-1.5,-.82,1.35]} rotation={[0,-.35,0]}><mesh><boxGeometry args={[1.8,.42,1.15]}/><meshStandardMaterial color="#b9c9c4" metalness={.78} roughness={.23}/></mesh><mesh position={[0,.42,0]}><boxGeometry args={[.82,.45,.78]}/><meshStandardMaterial color="#122320" metalness={.7}/></mesh>{[-.68,.68].flatMap(x=>[-.52,.52].map(z=><mesh key={`${x}-${z}`} position={[x,-.28,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.28,.28,.22,18]}/><meshStandardMaterial color="#07100f"/></mesh>))}<pointLight position={[.92,.08,.42]} color="#d6ff79" intensity={4} distance={4}/></group>
  <Float speed={1.25} rotationIntensity={.15} floatIntensity={.35}><group position={[2.15,-.15,.2]}><mesh position={[0,-.8,0]}><cylinderGeometry args={[.5,.7,.25,6]}/><meshStandardMaterial color="#172927" metalness={.8}/></mesh><mesh position={[0,.05,0]}><cylinderGeometry args={[.1,.17,1.65,10]}/><meshStandardMaterial color="#d9ebe5" metalness={.65}/></mesh><mesh position={[0,.92,0]}><octahedronGeometry args={[.46,0]}/><meshStandardMaterial color="#3fe1d0" emissive="#0da897" emissiveIntensity={1.8}/></mesh><mesh rotation={[Math.PI/2,0,0]} position={[0,.35,0]}><torusGeometry args={[.55,.018,10,64]}/><meshBasicMaterial color="#56f5e0"/></mesh></group></Float>
  <Sparkles count={70} scale={[12,6,10]} size={1.3} speed={.2} color="#69eedf" opacity={.45}/>
 </>;
}

const layers=[['01','SENTINEL','Presencia fija y contexto ambiental persistente.'],['02','AERIAL','Observación autónoma y captura multiespectral.'],['03','GROUND','Inspección terrestre y verdad de suelo.'],['04','INTELLIGENCE','Evidencia georreferenciada para decidir.']];

export function PublicHome(){return <main className="public-home">
 <nav className="public-nav"><a href="#top"><img src="/demo/assets/brand/up-ai-down-logo.png" alt="UP AI DOWN"/></a><div><a href="#system">Ecosistema</a><a href="#vision">Visión</a><a className="client" href={CLIENTS}>Portal clientes</a></div></nav>
 <section id="top" className="public-hero"><div className="public-canvas" aria-label="Ecosistema autónomo tridimensional"><Canvas camera={{position:[0,1.1,7],fov:48}} dpr={[1,1.6]}><DigitalField/></Canvas></div><div className="hero-shade"/><div className="hero-copy"><p className="eyebrow"><i/>AUTONOMOUS FIELD INTELLIGENCE</p><h1>Inteligencia que<br/><em>toca tierra.</em></h1><p className="lead">Conectamos observación aérea, robótica terrestre y sensores persistentes para convertir el campo en decisiones verificables.</p><div className="actions"><a className="primary" href={INVESTORS}>Acceso inversores <span>↗</span></a><a href={CLIENTS}>CRM de clientes <span>↗</span></a></div></div><div className="coordinates"><span>40.4168° N</span><span>03.7038° W</span><b>LIVE SYSTEM CONCEPT</b></div><a className="scroll" href="#system">DESCUBRIR<i/></a></section>
 <section id="system" className="system"><header><p>UN SISTEMA · MÚLTIPLES PERSPECTIVAS</p><h2>Observar desde el aire.<br/><span>Verificar sobre el terreno.</span></h2></header><div className="layers">{layers.map(([n,title,body])=><article key={n}><small>{n}</small><div className="orbit"><i/></div><h3>{title}</h3><p>{body}</p></article>)}</div></section>
 <section id="vision" className="manifesto"><div className="manifesto-image"><img src="/demo/assets/presentation/system-architecture.png" alt="Arquitectura del sistema extraída de la presentación técnica"/></div><div className="manifesto-copy"><p>DE LA SEÑAL A LA DECISIÓN</p><h2>Una memoria digital<br/>para cada parcela.</h2><p>Cada recorrido crea pares de datos tierra-aire vinculados al mismo lugar y momento. El resultado es contexto: medible, comparable y preparado para evolucionar.</p><div className="stat"><strong>24/7</strong><span>observación persistente</span></div><div className="stat"><strong>4G/LTE</strong><span>conectividad cloud</span></div></div></section>
 <section className="access"><div><p>PORTALES SEGUROS</p><h2>Entra en tu espacio.</h2></div><a href={INVESTORS}><small>01 · INVERSORES</small><strong>Investor Room</strong><span>Presentaciones, demo y documentación privada →</span></a><a href={CLIENTS}><small>02 · CLIENTES</small><strong>Client CRM</strong><span>Proyectos, soporte y documentos →</span></a></section>
 <footer className="public-footer"><img src="/demo/assets/brand/up-ai-down-logo.png" alt="UP AI DOWN"/><p>Robótica autónoma · Observación aérea · Inteligencia agrícola</p><span>© 2026 UP AI DOWN</span></footer>
 </main>}
