# Correspondencia documental — 10 septiembre 2026

Fuentes primarias del producto: dossier Enterprise aportado por Chris, páginas 4–7, y `docs/3D_VISUAL_EXPERIENCE_HANDOFF_REPORT.md`, secciones 2, 5, 8–10. La instrucción del usuario confirma que WALL-AI también despliega un dron.

| Elemento | Evidencia | Implementación | Límite |
|---|---|---|---|
| UPAIDOWN Station | Dossier pp. 4–6: cajón superior de alojamiento de dron, apertura/cierre | Puerta frontal abatible, guías telescópicas intermedias y bandeja extraíble; techo fijo; salida vertical fuera del techo | Dirección de bisagra, recorrido y dimensiones propuestos; sin CAD validado |
| WALL-AI | Handoff §2/5: bahía superior cerrada, tapa articulada, plataforma, dron, secuencia de ida y regreso; confirmación del usuario | Interior abierto, tapa con pivote trasero, plataforma elevadora con vástagos, segundo dron; sensor adelantado para despejar salida | Reubicación y volúmenes son soluciones conceptuales |
| Seguridad cinemática | Handoff §8: movimiento mecánico controlado | Apertura antes de extender, plataforma fuera antes de despegar, aterrizaje antes de recoger y cerrar; rover inmóvil en vuelo | Reglas de animación, no certificación de seguridad |
| Aéreas | Dossier: imágenes RGB y multiespectrales | Cámara cenital durante vuelo y render ortográfico RGB de la misma parcela; dos aeronaves | No fotografías ni ortomosaico real |
| NDVI | USGS: (NIR−RED)/(NIR+RED) | Dos reflectancias sintéticas por celda, máscara de dosel ligada a las filas, medias de parcela y dosel separadas | El RGB no produce NDVI; sin sensor, bandas medidas ni calibración |
| Informes | Dossier p.7: informes personalizados, mapas, integración de datos | Informe HTML autónomo e imprimible A4, vistas RGB/NDVI, métricas, muestra según fase, método, calidad, fuentes; JSON y CSV | Sin diagnóstico agronómico ni falsa precisión espacial |

Referencias metodológicas:
- https://www.usgs.gov/landsat-missions/landsat-normalized-difference-vegetation-index
- https://support.pix4d.com/hc/en-us/articles/360022919691

No se han inventado cámara, GSD, fecha de adquisición, coordenadas, precisión RTK ni calibración radiométrica. La celda de 0,50 m es la cuadrícula de análisis de la simulación, no una prestación del sensor. La superficie bajo el umbral ilustrativo se cuenta solo sobre dosel para evitar confundir suelo entre filas con anomalías del cultivo.

## Inspección local y térmica solicitada por el usuario
WALL-AI se representa a escala 0,80 respecto a la versión anterior. La posición final compensa esa escala para mantener la sonda sobre el punto de muestra. Su aeronave sube a 12 m en coordenadas de la escena y recorre una región de 12 × 10 m centrada en el rover detenido. Son dimensiones narrativas, no prestaciones certificadas.

Se incorpora un sensor térmico conceptual junto al RGB, un mapa térmico sintético y cuatro observaciones: dosel con anomalía, posible tejido seco, vegetación fuera de fila y dosel activo de referencia. Las tres primeras generan incidencias locales para revisión por mantenimiento. El estado se conserva solo en el navegador y se puede exportar; no se envía ninguna notificación externa. No hay clasificador real ni captura térmica radiométrica.

La temperatura de dosel no identifica por sí sola la causa del estrés. Las hipótesis de plagas, tejido muerto o hierbas no deseadas se deben confirmar con inspección RGB y de campo. Referencia: https://www.mdpi.com/2072-4292/13/1/68 . No se asignan probabilidades inventadas ni tratamientos automáticos.

## INSECE / lectura visible de suelo — 10 septiembre 2026
El usuario confirmó los siete canales de INSECE: humedad, temperatura, pH, conductividad, N, P y K. Se contrastaron los siete campos con insece_ios/Views/DashboardView.swift:190–197. CE en la app es µS/cm; la demo conserva dS/m (1,31 dS/m = 1310 µS/cm). No se verificó protocolo o calibración. Unidades y valores de esta demo son fixtures, con N/P/K en mg/kg y CE en dS/m. Todos los valores se adquieren después de la inserción, se estabilizan en 103 s y se exportan con la misma fuente.
WALL-AI tiene escala 0,60 (25 % menor que la versión 0,80). Orugas animadas en desplazamiento. Sonda con recorrido conceptual 0,48 × escala, primer plano y terreno RGB sin capa de análisis durante la inserción. Los visores espectrales proceden de las reflectancias sintéticas; el visor RGB renderiza la misma extensión local cenital. Grabación exportable incluye siete canales.

## Station con tijera y recorrido de tres puntos
Cajón extendido antes de elevar; deck sube 0,52 unidades conceptuales, hasta la cota de cubierta. Brazos cruzados de longitud constante; aterrizaje antes de descenso, descenso antes de retracción. Misión 192 s: S-01 94–110, S-02 126–142, S-03 160–176; trayectos por pasillo de servicio x=-14 y retorno 176–192. Muestras sintéticas identificadas y exportadas individualmente; vídeos incluyen RGB, térmica, falso color espectral, NDVI y siete lecturas de cada punto.

## Cámaras embarcadas de WALL-AI
Visión frontal izquierda/derecha desde las cámaras del mástil del propio robot, con perspectiva de 80°, altura y orientación derivadas del modelo y recorrido. Captura RGB 3D a 12 actualizaciones/s, fotogramas exportables y visor integrado en el vídeo de misión durante desplazamientos y paradas. Separado del visor cenital del dron. No se afirma detección autónoma de obstáculos, identificación de plantas ni grabación de hardware real.
