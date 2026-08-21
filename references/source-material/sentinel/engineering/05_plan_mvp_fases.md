# Plan MVP y Fases

## Principio de Desarrollo

El proyecto debe avanzar por reduccion de riesgo. Primero se valida energia, comunicaciones y sensorizacion. Despues se incorpora carga de dron. La automatizacion completa solo debe abordarse cuando el sistema base sea estable.

## Fase 0 - Definicion

Duracion estimada: 1-2 semanas.

Objetivos:

- Definir finca piloto.
- Confirmar cobertura 4G.
- Elegir dron objetivo.
- Elegir autonomia minima sin sol.
- Decidir si V1 tendra solo soporte manual o carga USB-C.

Entregables:

- Requisitos finales V1.
- Plano preliminar.
- BOM cerrada.
- Presupuesto.

## Fase 1 - Estacion Base V1

Duracion estimada: 4-8 semanas.

Incluye:

- Mastil fijo.
- Caja IP66.
- Panel solar.
- Bateria LiFePO4.
- MPPT.
- Router 4G/WiFi.
- Sensores meteorologicos.
- Telemetria remota.
- Dashboard basico.

No incluye:

- Vuelo autonomo.
- Carga automatica.
- Mecanismo motorizado.

Criterios de exito:

- 30 dias online con menos de 5 % de caidas no recuperadas.
- Medicion fiable de bateria y viento.
- Alertas remotas funcionando.
- Mantenimiento fisico sencillo.

## Fase 2 - Soporte de Dron y Carga Manual/Semiautomatica

Duracion estimada: 4-6 semanas tras V1.

Incluye:

- Bandeja o soporte protegido para dron/baterias.
- Cargador USB-C PD desde bateria principal.
- Politicas de carga segun estado de bateria.
- Registro de ciclos de carga.
- Procedimiento de mantenimiento.

Criterios de exito:

- Cargar baterias sin sobrecalentamiento.
- No descargar bateria principal por debajo de umbral.
- Tecnico puede operar el sistema sin herramientas especiales.

## Fase 3 - Dock de Carga

Duracion estimada: 8-16 semanas.

Incluye:

- Evaluacion HEISHA DPad 60 o alternativa.
- Pruebas de aterrizaje y alineacion.
- Carga por contactos o sistema adaptado.
- Sensorizacion de estado de dock.
- Cubierta/proteccion ante lluvia y polvo.

Criterios de exito:

- 100 ciclos de carga sin fallo electrico.
- Aterrizaje repetible en condiciones controladas.
- Bloqueo automatico con viento/lluvia.

## Fase 4 - Automatizacion Avanzada

Duracion estimada: 3-6 meses.

Incluye:

- Misiones programadas.
- Despegue/aterrizaje autonomo.
- Integracion legal/operativa.
- Mecanismo de elevacion si sigue justificado.
- Seguridad ampliada.

Criterios de exito:

- Operacion repetible con supervision remota.
- Cumplimiento normativo documentado.
- Procedimiento de emergencia probado.

## Decision Critica

La pregunta clave no es "se puede construir todo", sino "que parte aporta valor primero". La V1 debe demostrar que el nodo rural autonomo funciona. La automatizacion del dron debe esperar a que el sistema base sea fiable.
