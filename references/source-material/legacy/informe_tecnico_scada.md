# Informe Técnico de Relevo (Handover) — Ajustes y Calibración del SCADA (Finca Campillo El Negro)

Este documento detalla las intervenciones realizadas en el SCADA 2D y 3D de la Finca Campillo El Negro, con el fin de corregir los pívots desalineados/duplicados, los recortes en los bordes del mapa y el comportamiento de navegación.

---

## 1. Problemas Diagnosticados y Soluciones Aplicadas

### A. Desalineación y Duplicidad de Pívots en el SCADA 3D
* **Causa:** Las coordenadas 3D de los pívots en `main3d.js` tenían un desfase de hasta 24 unidades en el eje Z (norte-sur) y radios gigantes desproporcionados. Esto causaba que la estructura 3D del pívot se dibujara lejos del círculo del cultivo real visible en la foto aérea satelital (creando la ilusión de "pívots duplicados"). Además, al estar colocados tan abajo, la mitad de los círculos se salía de los límites del terreno (Z > 80) y se cortaban con el vacío.
* **Solución:** Recalculamos las posiciones `[X, Z]` and los radios `r` en 3D basándonos en la calibración 1:1 original del mapa extraída de `original-main.js`. 
* **Resultado:** Coincidencia exacta con la ortofoto de satélite. Los pívots en 3D están centrados en sus parcelas y ninguno sobrepasa el borde del terreno (Z máximo = 48.8, muy inferior a los límites del plano de 160x160).

### B. Recortes de Pívots en el SCADA 2D
* **Causa:** El contenedor del mapa 2D (`.pivots-canvas`) tenía `overflow: hidden;`. Los pívots situados cerca del borde inferior del mapa (como P1, P2 y P9) quedaban cortados a la mitad y sus etiquetas de estado no se veían.
* **Solución:** Cambiamos la regla CSS del canvas en `scadas.js` a `overflow: visible;` y movimos las etiquetas de estado del exterior (`bottom: -22px`) al interior del círculo (`bottom: 8%`) para evitar desbordes en móviles, además de reducir los tamaños a proporciones reales de escala (máx. 24%).
* **Resultado:** Visualización completa de todas las circunferencias de riego y las etiquetas sin recortes en la tarjeta.

### C. Navegación 3D Molesta (Modales que se abren solos)
* **Causa:** Al arrastrar el ratón para rotar o desplazar la cámara en el SCADA 3D, el evento final de `click` en Three.js activaba el modal de información si el cursor pasaba por encima de un pívot al soltar el botón.
* **Solución:** Modificamos `setupRaycaster()` en `main3d.js` para registrar el punto de inicio `mousedown` (`downX` y `downY`). El handler del evento `click` ahora calcula la distancia del movimiento y, si es mayor a 5 píxeles (`Math.hypot()`), determina que fue un arrastre de navegación y anula la apertura del modal.
* **Resultado:** Navegación fluida por la escena 3D sin ventanas emergentes molestas bloqueando la vista.

### D. Cierre del Tooltip en el SCADA 2D
* **Causa:** En dispositivos móviles y táctiles, al pasar el dedo o tocar un pívot, el tooltip persistía de forma fija en la pantalla simulando un modal congelado.
* **Solución:** Añadimos un listener `click` en los nodos de pívots de `scadas.js` que fuerza la propiedad `opacity: 0` del tooltip de manera inmediata. También quitamos la fila de texto estática obsoleta `"Dato: Pendiente PLC"`.

### E. Limpieza de Ruido Visual en la Escena 3D
* **Causa:** Las tuberías 3D (`buildPipelines()`) y los soportes diagonales de los brazos de los pívots generaban líneas negras gruesas que cruzaban toda la pantalla en forma de telaraña caótica, tapando la imagen real de la finca.
* **Solución:** Desactivamos el módulo de tuberías completas y los tirantes diagonales del brazo giratorio en `main3d.js`. Para mantener la alta fidelidad visual del gemelo digital, mantuvimos los elementos premium principales (Cielo degradado crepuscular, balsa de agua animada 3D, paneles solares 3D, nubes en altura y las oficinas de bombeo).

---

## 2. Archivos Modificados

1. **`backend_cloud/dashboard/public/js/modules/scadas.js`**
   * CSS de `.pivots-canvas` cambiado a `overflow: visible;` para evitar recortes.
   * CSS de `.pivot-label-box` ajustado a `bottom: 8%` (interior del nodo) con colores adaptados.
   * Array `pivots` de inicialización corregido con posiciones de calibración real (del 1 al 9, sin duplicidades en datos).
   * Listener `click` añadido a los elementos pívot para ocultar el tooltip al pulsar.
   * Limpieza de fila redundante "Dato: Pendiente PLC" en el tooltip html.

2. **`scada/campillo-el-negro/js/main3d.js`**
   * Array de calibración 3D `PIVOTS` corregido con coordenadas `[X, Z]` y radios `r` alineados milimétricamente con el satélite.
   * Modificación en `setupRaycaster()` añadiendo detección de arrastre (`Math.hypot() > 5px`) en `mousedown` / `click` para prevenir la apertura accidental del modal del pívot.
   * Desactivación de tuberías (`buildPipelines` convertida a no-op) y tirantes del brazo giratorio.
   * Conservación selectiva de componentes en `buildScene` (Cielo, Terreno, Embalse, Solar, Bombas, Pívots, Partículas y Nubes).
   * Cámara de inicio y objetivos de órbita `CAM_TARGETS` centrados en el centroide real de la instalación `[-10, 20]` con un radio inicial de `115` y niebla suavizada a `0.0008` para que los pívots P1 y P9 no se corten en la lejanía.

---

## 3. Estado de Calibración de Pívots (Valores Exactos)

Las coordenadas de ambos entornos han quedado unificadas bajo el siguiente esquema:

| ID Pívot | Coordenada 2D (X%, Y%) | Coordenada 3D (X, Z) | Radio 3D (r) | Línea de Riego |
|---|---|---|---|---|
| **P1** | `(32%, 72%)` | `(-28.8, 35.2)` | `13.6` | Line 7 (Pívot Gigante) |
| **P2** | `(52%, 72%)` | `(3.2, 35.2)` | `14.4` | Line 8 |
| **P3** | `(40%, 52%)` | `(-16.0, 3.2)` | `13.6` | Line 9 |
| **P4** | `(63%, 52%)` | `(20.8, 3.2)` | `13.6` | Line 10 |
| **P5** | N/A (Goteo) | `(null, null)` | `0.0` | Line 16 (Sector de Olivos) |
| **P6** | `(76%, 40%)` | `(41.6, -16.0)` | `12.8` | Line 16 |
| **P7** | `(44%, 22%)` | `(-9.6, -44.8)` | `15.2` | Line 13 |
| **P8** | `(68%, 25%)` | `(28.8, -40.0)` | `12.8` | Line 11 |
| **P9** | `(83%, 62%)` | `(52.8, 19.2)` | `12.8` | Line 15 (Llamado P8 en pantalla) |

---

## 4. Instrucciones para el Próximo Agente

1. **Validación de Sintaxis:**
   Antes de subir cualquier cambio al servidor de producción, se debe validar la sintaxis de JavaScript de forma local:
   ```bash
   node -c backend_cloud/dashboard/public/js/modules/scadas.js
   ```
2. **Procedimiento de Despliegue (Deploy):**
   Los archivos modificados deben subirse mediante SCP a sus respectivas rutas en el Servidor Pro (`82.223.44.126`, puerto SSH `2244`):
   * `scadas.js` -> `/var/www/insece-cloud/public/js/modules/scadas.js`
   * `main3d.js` -> `/var/www/insece-scada/campillo-el-negro/js/main3d.js`
   Tras actualizar `scadas.js`, se requiere reiniciar la app en PM2 para purgar la caché de rutas dinámicas de la API:
   ```bash
   ssh -p 2244 root@82.223.44.126 "pm2 reload insece-cloud"
   ```
3. **Caché del Navegador:**
   Debido a que los navegadores almacenan agresivamente los scripts de WebGL/Three.js y módulos del dashboard, siempre es indispensable realizar una recarga dura (`Ctrl + F5` o `Cmd + Shift + R`) al verificar cambios en el visor SCADA.
