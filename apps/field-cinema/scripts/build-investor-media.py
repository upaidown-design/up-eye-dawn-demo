from pathlib import Path
import subprocess,sys,textwrap
source=Path(sys.argv[1]);dest=Path(sys.argv[2]);(dest/'previews').mkdir(parents=True,exist_ok=True)
ff='/Users/chris/homebrew/bin/ffmpeg'
def run(args):subprocess.run([ff,'-hide_banner','-loglevel','error','-y',*args],check=True)
full=dest/'UPAIDOWN-mision-completa.mp4'
run(['-i',str(source),'-an','-vf','scale=1280:720,fps=30','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(full)])
clips=[('station',22,15,30),('aerial',39,12,43),('soil',94,16,104),('route',142,12,148)]
for name,start,length,still in clips:
 run(['-ss',str(start),'-i',str(full),'-t',str(length),'-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(dest/'previews'/f'{name}.mp4')])
 run(['-ss',str(still),'-i',str(full),'-frames:v','1','-q:v','2',str(dest/'previews'/f'{name}.jpg')])
chapters=[(0,12,'Un campo conectado: observación aérea, presencia fija e inspección terrestre.','A connected field: aerial observation, a fixed station and ground inspection.'),(12,28,'Station eleva el mástil, abre la bahía y prepara la plataforma de tijera.','Station raises its mast, opens the bay and prepares the scissor platform.'),(28,57,'El dron despega y recorre la parcela. Las cámaras y las lecturas son simuladas.','The drone takes off and surveys the plot. Camera views and readings are simulated.'),(57,72,'El NDVI utiliza bandas roja y NIR sintéticas. Las diferencias orientan la inspección.','NDVI uses synthetic red and NIR bands. Local differences guide the inspection.'),(72,94,'WALL-AI despliega su dron para inspeccionar el entorno local con RGB y térmica.','WALL-AI deploys its drone to inspect the local area with RGB and thermal views.'),(94,110,'Primera muestra INSECE: humedad, temperatura, pH, conductividad y N/P/K.','First INSECE sample: moisture, temperature, pH, conductivity and N/P/K.'),(110,126,'Las cámaras del robot observan el entorno durante el recorrido al segundo punto.','The onboard cameras observe the surroundings on the way to the second location.'),(126,142,'El robot se detiene, introduce la sonda y registra la segunda muestra.','The robot stops, inserts its probe and records the second sample.'),(142,160,'WALL-AI recorre otra zona del viñedo con las cámaras a bordo.','WALL-AI travels through another part of the vineyard with its onboard cameras.'),(160,176,'Tercera muestra: siete parámetros vinculados a su posición y momento.','Third sample: seven parameters linked to their location and acquisition time.'),(176,193,'El robot regresa con la sonda recogida. Tres muestras e imágenes quedan listas para revisión.','The robot returns with its probe retracted. Three samples and imagery are ready for review.')]
def stamp(t):return f'{int(t)//3600:02}:{int(t)//60%60:02}:{int(t)%60:02}.000'
def vtt(path,lang,start=0,end=193):
 out=['WEBVTT','']
 for a,b,es,en in chapters:
  lo=max(a,start);hi=min(b,end)
  if hi>lo:out.extend([f'{stamp(lo-start)} --> {stamp(hi-start)}','\n'.join(textwrap.wrap(es if lang=='es' else en,64)),''])
 path.write_text('\n'.join(out))
for lang in ['es','en']:
 vtt(dest/f'mission-{lang}.vtt',lang)
 for name,start,length,_ in clips:vtt(dest/'previews'/f'{name}-{lang}.vtt',lang,start,start+length)
(dest/'presentacion.html').write_text('''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UPAIDOWN · Presentación</title><style>body{margin:0;background:#10212a;color:#e2eee7;font:16px system-ui}header,main{max-width:1280px;margin:auto;padding:24px}header{background:#eaf1ed;display:flex;align-items:center;justify-content:space-between}header img{width:190px}a{color:inherit}header a{color:#173a2b}video{width:100%;height:auto}p{line-height:1.6}nav{display:flex;gap:25px;flex-wrap:wrap}</style><header><img src="../brand/upaidown-official.png" alt="UP AI DOWN"><a href="../">Abrir Cinema 3D ↗</a></header><main><h1>Del aire a la raíz</h1><p>Demostración conceptual · Concept demonstration. Imágenes y datos simulados / Simulated imagery and data. Subtítulos ES / EN disponibles en el reproductor.</p><video controls playsinline preload="metadata" poster="previews/station.jpg"><source src="UPAIDOWN-mision-completa.mp4" type="video/mp4"><track kind="subtitles" src="mission-es.vtt" srclang="es" label="Español"><track kind="subtitles" src="mission-en.vtt" srclang="en" label="English"></video><nav><a href="UPAIDOWN-mision-completa.mp4" download>Descargar MP4 / Download MP4</a><a href="mission-en.vtt" download>English subtitles</a><a href="mission-es.vtt" download>Subtítulos en español</a><a href="../">Explorar la misión / Explore the mission</a></nav></main></html>''')
print('Media created',dest)
