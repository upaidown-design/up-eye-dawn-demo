import { useEffect, useRef, useState } from 'react';

const ASSETS = '/demo/assets/';
const ART = ASSETS + 'editorial-20260911/';
const CONCEPTS = ASSETS + 'concepts/generated-2026-08-16/';
const CINEMA = '/field-cinema/';
const MEDIA = CINEMA + 'media/';
const PREVIEWS = MEDIA + 'previews/';

type Language = 'es' | 'en';

function initialLanguage(): Language {
  const value = new URLSearchParams(location.search).get('lang');
  if (value === 'es' || value === 'en') return value;
  try {
    return localStorage.getItem('ued-language') === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h15m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Play() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m6 3 11 7-11 7Z" fill="currentColor" />
    </svg>
  );
}

interface SoilSample {
  id: string;
  time: string;
  location: string;
  values: number[];
}

// INSECE synthetic field evidence
const samples: SoilSample[] = [
  { id: 'S-01', time: '01:43', location: 'Hilera 12 · Sector Norte', values: [28.4, 21.7, 6.7, 1.31, 42, 18, 156] },
  { id: 'S-02', time: '02:15', location: 'Hilera 18 · Cuadrante Central', values: [25.8, 19.7, 6.1, 1.19, 38.2, 16.4, 142.0] },
  { id: 'S-03', time: '02:49', location: 'Hilera 24 · Depresión Sur', values: [30.4, 23.2, 7.2, 1.40, 44.9, 19.3, 166.9] }
];

export function PublicHome() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState(0);
  const [sample, setSample] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'station' | 'drone' | 'rover'>('all');

  const videoRef = useRef<HTMLVideoElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const t = (es: string, en: string) => (language === 'es' ? es : en);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem('ued-language', language);
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    document.title =
      'UPAIDOWN · ' + (language === 'es' ? 'Del aire a la raíz' : 'From air to root');
  }, [language]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  const clips = [
    {
      id: 'station',
      duration: '00:15',
      code: 'SQ-01',
      label: t('Despliegue Station', 'Station Deployment'),
      title: t('Nodo fijo autónomo y despegue coordinado.', 'Autonomous base station and coordinated launch.'),
      body: t(
        'La bahía estanca de Station se desbloquea, la plataforma de tijera eleva el dron al horizonte de despegue y la estación asegura el reabastecimiento en parcela.',
        'Station weather-sealed bay unlocks, the scissor platform raises the drone to launch horizon and grounds local battery management in field.'
      ),
      specs: [
        { label: t('Mecanismo', 'Mechanism'), val: t('Tijera servoasistida', 'Servo scissor hoist') },
        { label: t('Protección', 'Sealing'), val: 'IP66 Industrial' },
        { label: t('Ciclo', 'Cycle'), val: '12s deploy / dock' }
      ]
    },
    {
      id: 'aerial',
      duration: '00:12',
      code: 'SQ-02',
      label: t('Vuelo SENTINEL-V3', 'SENTINEL-V3 Flight'),
      title: t('Teledetección multiespectral y vista térmica cenital.', 'Multispectral remote sensing and overhead thermal view.'),
      body: t(
        'Mapeo perimetral y ortomosaico multiespectral. Detecta gradientes de estrés hídrico mediante firmas térmicas para georreferenciar las órdenes de muestreo terrestre.',
        'Perimeter mapping and multispectral orthomosaic. Detects water stress gradients via thermal signatures to georeference ground sampling dispatches.'
      ),
      specs: [
        { label: t('Carga útil', 'Payload'), val: 'RGB 4K + Radiometric LWIR' },
        { label: t('Índices', 'Indices'), val: 'NDVI / NDRE / SAVI' },
        { label: t('Autonomía', 'Flight Time'), val: '35 min / ciclo' }
      ]
    },
    {
      id: 'route',
      duration: '00:12',
      code: 'SQ-03',
      label: t('Navegación WALL-AI', 'WALL-AI Ground Route'),
      title: t('Inspección entre hileras y visión computacional a ras de cepa.', 'Inter-row navigation and computer vision at canopy level.'),
      body: t(
        'El rover todoterreno con tracción por orugas orquesta la navegación autónoma por surco, analizando vigor foliar y guiando la sonda hasta el punto exacto de testeo.',
        'Tracked all-terrain rover navigates autonomously through rows, assessing canopy vigor and driving the probe directly to target test coordinates.'
      ),
      specs: [
        { label: t('Tracción', 'Drivetrain'), val: t('Orugas de caucho reforzado', 'Reinforced rubber tracks') },
        { label: t('Cámaras', 'Sensors'), val: 'Stereo RGB-D + Thermal' },
        { label: t('Despeje suelo', 'Clearance'), val: '320 mm' }
      ]
    },
    {
      id: 'soil',
      duration: '00:16',
      code: 'SQ-04',
      label: t('Sonda INSECE', 'INSECE Soil Core'),
      title: t('Penetración del terreno y lectura física de 7 parámetros.', 'Soil penetration and physical 7-channel analytical capture.'),
      body: t(
        'Actuador electromecánico lineal de penetración. El cabezal sensa humedad volumétrica, conductividad iónica, pH y balance NPK en menos de 10 segundos.',
        'Electromechanical linear actuator drives into soil. Sensor head measures volumetric moisture, electrical conductivity, pH and NPK balance in under 10s.'
      ),
      specs: [
        { label: t('Profundidad', 'Depth'), val: '0 - 250 mm ajustable' },
        { label: t('Canales', 'Channels'), val: '7 analitos simultáneos' },
        { label: t('Fijación', 'Storage'), val: 'Telemetría georreferenciada' }
      ]
    }
  ];

  const clip = clips[preview] ?? clips[0]!;

  const metrics = [
    { symbol: 'H₂O', name: t('Humedad Volumétrica', 'Soil Moisture'), unit: '%', digits: 1, min: 20, max: 35, optMin: 22, optMax: 30 },
    { symbol: 'T°', name: t('Temperatura del Suelo', 'Soil Temperature'), unit: '°C', digits: 1, min: 10, max: 30, optMin: 18, optMax: 24 },
    { symbol: 'pH', name: 'pH', unit: '', digits: 2, min: 4.5, max: 8.5, optMin: 6.0, optMax: 7.2 },
    { symbol: 'EC', name: t('Conductividad Eléctrica', 'Electrical Conductivity'), unit: 'dS/m', digits: 2, min: 0.5, max: 2.5, optMin: 1.0, optMax: 1.6 },
    { symbol: 'N', name: t('Nitrógeno Disponible', 'Available Nitrogen'), unit: 'mg/kg', digits: 1, min: 20, max: 60, optMin: 35, optMax: 50 },
    { symbol: 'P', name: t('Fósforo Asimilable', 'Assimilable Phosphorus'), unit: 'mg/kg', digits: 1, min: 10, max: 30, optMin: 15, optMax: 22 },
    { symbol: 'K', name: t('Potasio Intercambiable', 'Exchangeable Potassium'), unit: 'mg/kg', digits: 1, min: 100, max: 220, optMin: 130, optMax: 180 }
  ];

  const showClip = (index: number) => {
    videoRef.current?.pause();
    setPreview(index);
    document.getElementById('cinema')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="public-home" data-i18n-skip>
      <a className="ph-skip" href="#main-content">
        {t('Saltar al contenido', 'Skip to content')}
      </a>

      {/* Industrial Header */}
      <header className="ph-header">
        <div className="ph-header-left">
          <a className="ph-brand" href="#top" aria-label="UPAIDOWN Official">
            <img src={ASSETS + 'brand/upaidown-official.png'} width="170" height="38" alt="UPAIDOWN" />
          </a>
          <div className="ph-badge-system">
            <span className="ph-badge-dot" />
            <span className="ph-badge-txt">{t('TECNOLOGÍA AGRO-ROBÓTICA', 'AGRI-ROBOTIC TECH')}</span>
          </div>
        </div>

        <nav className="ph-desktop-nav" aria-label={t('Navegación principal', 'Main navigation')}>
          <a href="#system">{t('Hardware & Sistema', 'Hardware & System')}</a>
          <a href="#cinema">{t('Misión en Campo', 'Field Mission')}</a>
          <a href="#intelligence">{t('Analítica INSECE', 'INSECE Analytics')}</a>
          <a href="#investors">{t('Hoja de Ruta', 'Roadmap')}</a>
        </nav>

        <div className="ph-header-actions">
          <div className="ph-language-group" role="group" aria-label={t('Idioma', 'Language')}>
            <button
              type="button"
              className={language === 'es' ? 'is-active' : ''}
              onClick={() => setLanguage('es')}
            >
              ES
            </button>
            <span className="ph-lang-sep" aria-hidden="true">/</span>
            <button
              type="button"
              className={language === 'en' ? 'is-active' : ''}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>

          <a className="ph-cta-cinema" href={CINEMA}>
            <span>Field Cinema 3D</span>
            <Arrow diagonal />
          </a>

          <button
            ref={menuButton}
            className="ph-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="ph-mobile-nav"
            aria-label={menuOpen ? t('Cerrar menú', 'Close menu') : t('Abrir menú', 'Open menu')}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <nav
          id="ph-mobile-nav"
          className={`ph-mobile-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label={t('Navegación móvil', 'Mobile navigation')}
        >
          <a href="#system" onClick={() => setMenuOpen(false)}>
            {t('Hardware & Sistema', 'Hardware & System')} <Arrow />
          </a>
          <a href="#cinema" onClick={() => setMenuOpen(false)}>
            {t('Misión en Campo', 'Field Mission')} <Arrow />
          </a>
          <a href="#intelligence" onClick={() => setMenuOpen(false)}>
            {t('Analítica INSECE', 'INSECE Analytics')} <Arrow />
          </a>
          <a href="#investors" onClick={() => setMenuOpen(false)}>
            {t('Hoja de Ruta', 'Roadmap')} <Arrow />
          </a>
          <div className="ph-mobile-actions">
            <a className="ph-btn-primary" href={CINEMA}>
              {t('Entrar a Field Cinema 3D', 'Enter Field Cinema 3D')} <Arrow diagonal />
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="ph-hero" id="top">
        <div className="ph-container ph-hero-grid" id="main-content">
          <div className="ph-hero-text">
            <div className="ph-tech-label">
              <span className="ph-pulse-beacon" />
              <span>{t('INGENIERÍA AGRÍCOLA AUTÓNOMA · CLUSTER DE CAMPO', 'AUTONOMOUS AGRI-ENGINEERING · FIELD CLUSTER')}</span>
            </div>

            <h1 className="ph-hero-title">
              {t('Del aire', 'From air')}
              <br />
              <span className="ph-accent-gradient">{t('a la raíz.', 'to root.')}</span>
            </h1>

            <p className="ph-hero-lead">
              {t(
                'Observación aérea con dron de parcela, inspección de proximidad con rover guiado por visión y medición física profunda del suelo.',
                'Aerial observation with plot drone, proximity inspection with vision-guided rover, and deep physical soil analytics.'
              )}
            </p>

            <div className="ph-hero-ctas">
              <a className="ph-btn-primary" href={CINEMA}>
                <span>{t('Explorar en 3D Interactivo', 'Explore in Interactive 3D')}</span>
                <Arrow diagonal />
              </a>

              <a className="ph-btn-secondary" href={MEDIA + 'presentacion.html'}>
                <Play />
                <span>{t('Ver Película Oficial (3 min)', 'Watch Official Film (3 min)')}</span>
              </a>
            </div>

            <div className="ph-hero-specs-bar">
              <div className="ph-spec-item">
                <span className="ph-spec-val">3</span>
                <span className="ph-spec-lbl">{t('Equipos coordinados', 'Coordinated systems')}</span>
              </div>
              <div className="ph-spec-sep" />
              <div className="ph-spec-item">
                <span className="ph-spec-val">7</span>
                <span className="ph-spec-lbl">{t('Parámetros de suelo', 'Soil parameters')}</span>
              </div>
              <div className="ph-spec-sep" />
              <div className="ph-spec-item">
                <span className="ph-spec-val">100%</span>
                <span className="ph-spec-lbl">{t('Georreferenciado', 'Georeferenced')}</span>
              </div>
            </div>
          </div>

          <div className="ph-hero-visual">
            <div className="ph-hero-media-wrapper">
              <picture>
                <source media="(max-width:768px)" srcSet={ART + 'field-hero-small.webp'} />
                <img
                  src={ART + 'field-hero.webp'}
                  width="1672"
                  height="941"
                  fetchPriority="high"
                  alt={t(
                    'Visualización industrial de Station con tijera elevada, dron SENTINEL-V3 y WALL-AI en viñedo',
                    'Industrial visualization of Station with scissor hoist, SENTINEL-V3 drone and WALL-AI in vineyard'
                  )}
                />
              </picture>

              {/* Interactive Telemetry Overlay Pins */}
              <div className="ph-visual-tag top-left">
                <span className="ph-tag-icon">SYS</span>
                <span>UPAIDOWN // FIELD CLUSTER M-001</span>
              </div>

              <div className="ph-telemetry-pins">
                <a href="#station" className="ph-pin ph-pin-station" title="UPAIDOWN Station">
                  <span className="ph-pin-pulse" />
                  <span className="ph-pin-box">01 // STATION</span>
                </a>

                <a href="#sentinel" className="ph-pin ph-pin-drone" title="SENTINEL-V3 Drone">
                  <span className="ph-pin-pulse" />
                  <span className="ph-pin-box">02 // SENTINEL-V3</span>
                </a>

                <a href="#wall-ai" className="ph-pin ph-pin-rover" title="WALL-AI Rover">
                  <span className="ph-pin-pulse" />
                  <span className="ph-pin-box">03 // WALL-AI</span>
                </a>
              </div>

              <div className="ph-visual-footer">
                <div className="ph-visual-nav-links">
                  <a href="#station">
                    <span className="ph-num">01</span> Station <Arrow diagonal />
                  </a>
                  <a href="#sentinel">
                    <span className="ph-num">02</span> Sentinel <Arrow diagonal />
                  </a>
                  <a href="#wall-ai">
                    <span className="ph-num">03</span> WALL-AI <Arrow diagonal />
                  </a>
                </div>
                <div className="ph-visual-stamp">
                  <span>{t('SIMULACIÓN FOTORREALISTA VALIDADA', 'VALIDATED PHOTOREALISTIC SIMULATION')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Hardware Section */}
      <section id="system" className="ph-section ph-system">
        <div className="ph-container">
          <div className="ph-section-header">
            <div>
              <span className="ph-kicker">01 / {t('ARQUITECTURA DE HARDWARE', 'HARDWARE ARCHITECTURE')}</span>
              <h2>
                {t('Tres equipos de campo.', 'Three field systems.')}
                <br />
                <span className="ph-heading-dim">{t('Una misma misión analítica.', 'One unified analytical mission.')}</span>
              </h2>
            </div>
            <p className="ph-header-summary">
              {t(
                'Cada unidad opera en su rango operativo para alimentar una matriz de datos común. La estación protege y recarga; el dron identifica gradientes cenitales; el rover penetra en la hilera para auditar la planta y el suelo.',
                'Each unit operates within its envelope to feed a unified data matrix. Station protects and recharges; drone identifies aerial gradients; rover penetrates the row to audit plant and soil.'
              )}
            </p>
          </div>

          <div className="ph-hardware-grid">
            {/* 01: Station */}
            <article className="ph-hw-card" id="station">
              <div className="ph-hw-image-container">
                <span className="ph-hw-index">01 // FIELD HUB</span>
                <img
                  src={ART + 'station.webp'}
                  width="800"
                  height="600"
                  loading="lazy"
                  alt={t('Mecanismo de tijera industrial y bahía UPAIDOWN Station', 'Industrial scissor hoist and bay of UPAIDOWN Station')}
                />
                <div className="ph-hw-status-badge">
                  <span className="ph-mini-led" />
                  <span>DOCK READY</span>
                </div>
              </div>

              <div className="ph-hw-body">
                <div className="ph-hw-title-row">
                  <h3>UPAIDOWN Station</h3>
                  <span className="ph-hw-type">{t('Nodo Base Fijo', 'Fixed Base Node')}</span>
                </div>
                <p>
                  {t(
                    'Punto de anclaje, recarga automatizada y resguardo meteorológico en campo. La plataforma de tijera servoasistida eleva la aeronave sobre el follaje para maniobras seguras de despegue y aterrizaje sin turbulencia de suelo.',
                    'Anchor point, automated recharging and weatherproof shelter in field. The servo scissor platform elevates the aircraft above canopy for turbulence-free takeoff and landing.'
                  )}
                </p>

                <div className="ph-hw-specs">
                  <div className="ph-hw-spec">
                    <span>{t('Chasis', 'Chassis')}</span>
                    <strong>Aluminio anodizado 6061-T6</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('Elevación', 'Hoist')}</span>
                    <strong>Tijera pantográfica 1.8m</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('Alimentación', 'Power')}</span>
                    <strong>Buffer solar + Litio LiFePO4</strong>
                  </div>
                </div>

                <button type="button" className="ph-btn-action" onClick={() => showClip(0)}>
                  <span>{t('Ver despliegue en vídeo', 'Watch deployment video')}</span>
                  <Arrow />
                </button>
              </div>
            </article>

            {/* 02: Sentinel-V3 */}
            <article className="ph-hw-card" id="sentinel">
              <div className="ph-hw-image-container">
                <span className="ph-hw-index">02 // AERIAL SENSING</span>
                <img
                  src={CONCEPTS + 'sentinel-master-reference-board.png'}
                  width="800"
                  height="600"
                  loading="lazy"
                  alt={t('Dron de observación aérea multiespectral SENTINEL-V3', 'SENTINEL-V3 multispectral aerial observation drone')}
                />
                <div className="ph-hw-status-badge">
                  <span className="ph-mini-led" />
                  <span>AUTONOMOUS FLIGHT</span>
                </div>
              </div>

              <div className="ph-hw-body">
                <div className="ph-hw-title-row">
                  <h3>SENTINEL-V3</h3>
                  <span className="ph-hw-type">{t('Aeronave Multiespectral', 'Multispectral Aircraft')}</span>
                </div>
                <p>
                  {t(
                    'Observación perimetral y ortofoto térmica. Sobrevuela las parcelas para cartografiar diferencias de vigor foliar (NDVI) y estrés hídrico, delimitando anomalías que priorizan la ruta de inspección del rover.',
                    'Perimeter observation and radiometric orthophoto. Surveys plots to map canopy vigor variations (NDVI) and water stress, vectorizing anomaly zones to prioritize rover dispatch.'
                  )}
                </p>

                <div className="ph-hw-specs">
                  <div className="ph-hw-spec">
                    <span>{t('Sensor Aéreo', 'Aerial Sensor')}</span>
                    <strong>Multispectral 5-band + LWIR</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('GSD Resolución', 'GSD Resolution')}</span>
                    <strong>1.2 cm/pixel a 40m AGL</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('Navegación', 'Navigation')}</span>
                    <strong>RTK Centimétrico dual</strong>
                  </div>
                </div>

                <button type="button" className="ph-btn-action" onClick={() => showClip(1)}>
                  <span>{t('Ver vuelo y telemetría', 'Watch flight & telemetry')}</span>
                  <Arrow />
                </button>
              </div>
            </article>

            {/* 03: WALL-AI */}
            <article className="ph-hw-card ph-hw-card-featured" id="wall-ai">
              <div className="ph-hw-image-container">
                <span className="ph-hw-index">03 // GROUND ROVER & INSECE</span>
                <img
                  src={ART + 'wall-ai.webp'}
                  width="800"
                  height="600"
                  loading="lazy"
                  alt={t('Rover terrestre WALL-AI con orugas y sonda INSECE frontal', 'WALL-AI ground rover with tracks and front INSECE probe')}
                />
                <div className="ph-hw-status-badge">
                  <span className="ph-mini-led" />
                  <span>DUAL CAM + PROBE</span>
                </div>
              </div>

              <div className="ph-hw-body">
                <div className="ph-hw-title-row">
                  <h3>WALL-AI + INSECE</h3>
                  <span className="ph-hw-type">{t('Rover Terrestre + Sonda', 'Ground Rover + Probe')}</span>
                </div>
                <p>
                  {t(
                    'Inspección microscópica a ras de suelo y análisis de suelo in situ. Tracción continua para surcos con barro, cámara estéreo para conteo de racimos y sonda INSECE para 7 parámetros físico-químicos del suelo.',
                    'Microscopic ground-level inspection and in-situ soil analysis. Heavy-duty track drivetrain for muddy terrain, stereo cameras for cluster count, and INSECE probe for 7 soil physical-chemical metrics.'
                  )}
                </p>

                <div className="ph-hw-specs">
                  <div className="ph-hw-spec">
                    <span>{t('Tracción', 'Drivetrain')}</span>
                    <strong>Orugas con motor brushless dual</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('Sonda Suelo', 'Soil Probe')}</span>
                    <strong>INSECE 7-Param electroquímico</strong>
                  </div>
                  <div className="ph-hw-spec">
                    <span>{t('IA de Borde', 'Edge AI')}</span>
                    <strong>NVIDIA Jetson / Hailo-8 NPU</strong>
                  </div>
                </div>

                <button type="button" className="ph-btn-action" onClick={() => showClip(2)}>
                  <span>{t('Ver recorrido e inserción', 'Watch route & insertion')}</span>
                  <Arrow />
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Cinema Theatre Section */}
      <section id="cinema" className="ph-section ph-cinema-theatre">
        <div className="ph-container">
          <div className="ph-section-header">
            <div>
              <span className="ph-kicker ph-kicker-cyan">02 / FIELD CINEMA & TELEMETRÍA</span>
              <h2>
                {t('Una misión completa.', 'One complete mission.')}
                <br />
                <span className="ph-heading-cyan">{t('Cuatro puntos de observación.', 'Four operational viewpoints.')}</span>
              </h2>
            </div>
            <div className="ph-cinema-quicklinks">
              <p>
                {t(
                  'Elige la fase operativa que deseas auditar. El reproductor carga los clips originales generados por el simulador 3D con subtítulos sincronizados.',
                  'Select the operational phase to audit. The player streams original 3D simulation captures with synchronized subtitles.'
                )}
              </p>
              <a className="ph-cinema-badge-link" href={CINEMA}>
                <span>{t('Abrir simulador 3D interactivo en tiempo real', 'Open real-time interactive 3D simulator')}</span>
                <Arrow diagonal />
              </a>
            </div>
          </div>

          <div className="ph-theatre-layout">
            <div className="ph-video-frame">
              <video
                ref={videoRef}
                key={clip.id + '-' + language}
                controls
                playsInline
                preload="metadata"
                poster={PREVIEWS + clip.id + '.jpg'}
                aria-label={clip.title}
                width="1280"
                height="720"
              >
                <source src={PREVIEWS + clip.id + '.mp4'} type="video/mp4" />
                <track
                  kind="subtitles"
                  src={PREVIEWS + clip.id + '-es.vtt'}
                  srcLang="es"
                  label="Español"
                  default={language === 'es'}
                />
                <track
                  kind="subtitles"
                  src={PREVIEWS + clip.id + '-en.vtt'}
                  srcLang="en"
                  label="English"
                  default={language === 'en'}
                />
                <a href={PREVIEWS + clip.id + '.mp4'}>{t('Descargar vídeo', 'Download video')}</a>
              </video>

              <div className="ph-video-hud">
                <div className="ph-hud-left">
                  <span className="ph-rec-dot" />
                  <span className="ph-hud-code">MISSION M-001 // {clip.code}</span>
                  <span className="ph-hud-sep">|</span>
                  <span className="ph-hud-fps">60 FPS 1080P SIM</span>
                </div>
                <div className="ph-hud-right">
                  <span>{clip.duration}</span>
                </div>
              </div>
            </div>

            <div className="ph-theatre-nav">
              <div className="ph-nav-header">
                <span>{t('CAPÍTULOS OPERATIVOS', 'OPERATIONAL CHAPTERS')}</span>
                <small>4 / 4 CLIPS</small>
              </div>

              <div className="ph-chapter-list" role="group" aria-label={t('Secuencias de misión', 'Mission clips')}>
                {clips.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ph-chapter-btn ${preview === idx ? 'is-active' : ''}`}
                    onClick={() => {
                      videoRef.current?.pause();
                      setPreview(idx);
                    }}
                  >
                    <div className="ph-chapter-meta">
                      <span className="ph-chapter-idx">{item.code}</span>
                      <span className="ph-chapter-dur">{item.duration}</span>
                    </div>
                    <div className="ph-chapter-info">
                      <strong>{item.label}</strong>
                      <p>{item.title}</p>
                    </div>
                    <div className="ph-chapter-play">
                      <Play />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ph-clip-details">
            <div className="ph-clip-desc">
              <h4>{clip.title}</h4>
              <p>{clip.body}</p>
            </div>

            <div className="ph-clip-specs-grid">
              {clip.specs.map((sp, i) => (
                <div key={i} className="ph-clip-spec-box">
                  <span>{sp.label}</span>
                  <strong>{sp.val}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="ph-theatre-footer">
            <div className="ph-theatre-note">
              <span className="ph-badge-sim">{t('ENTORNO SIMULADO', 'SIMULATED ENVIRONMENT')}</span>
              <p>
                {t(
                  'Datos y dinámica cinemática procesados en tiempo real sobre gemelo digital de viñedo. Acceso público sin registro.',
                  'Data and kinematics computed in real-time on vineyard digital twin. Open public access without registration.'
                )}
              </p>
            </div>
            <div className="ph-theatre-actions">
              <a className="ph-btn-outline-light" href={MEDIA + 'presentacion.html'}>
                <Play />
                <span>{t('Ver Película Completa (3 min)', 'Watch Full Film (3 min)')}</span>
              </a>
              <a className="ph-btn-link-light" href={MEDIA + 'UPAIDOWN-mision-completa.mp4'} download>
                <span>{t('Descargar MP4 HD', 'Download HD MP4')}</span>
                <Arrow diagonal />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Soil Telemetry & Analytics Studio */}
      <section id="intelligence" className="ph-section ph-intelligence">
        <div className="ph-container">
          <div className="ph-section-header">
            <div>
              <span className="ph-kicker">03 / {t('ANALÍTICA DEL SUELO', 'SOIL ANALYTICS')}</span>
              <h2>
                {t('Siete parámetros físicos.', 'Seven physical parameters.')}
                <br />
                <span className="ph-heading-dim">{t('Decisiones agronómicas con rigor.', 'Agronomic precision decisions.')}</span>
              </h2>
            </div>
            <p className="ph-header-summary">
              {t(
                'La sonda INSECE penetra bajo la capa superficial para evaluar las condiciones radiculares directamente en la hilera, eliminando la incertidumbre de las estimaciones meteorológicas satelitales.',
                'The INSECE probe penetrates beneath the surface layer to evaluate root conditions directly inside the row, eliminating satellite weather guesswork.'
              )}
            </p>
          </div>

          <div className="ph-telemetry-workbench">
            <div className="ph-telemetry-card">
              <div className="ph-telemetry-header">
                <div>
                  <span className="ph-kicker">PROBE INSECE-V2 // TELEMETRÍA M-001</span>
                  <h3>{t('Puntos de Muestreo Georreferenciados', 'Georeferenced Sampling Points')}</h3>
                </div>
                <span className="ph-badge-sim">{t('EVIDENCIA SINTÉTICA', 'SYNTHETIC EVIDENCE')}</span>
              </div>

              <div className="ph-sample-selector" role="group" aria-label={t('Seleccionar muestra', 'Select sample')}>
                {samples.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ph-sample-btn ${sample === idx ? 'is-active' : ''}`}
                    onClick={() => setSample(idx)}
                  >
                    <span className="ph-sample-code">{item.id}</span>
                    <span className="ph-sample-loc">{item.location}</span>
                    <span className="ph-sample-time">{item.time} UTC</span>
                  </button>
                ))}
              </div>

              <div className="ph-gauges-grid" aria-live="polite">
                {metrics.map((m, idx) => {
                  const currentSample = samples[sample] ?? samples[0]!;
                  const val = currentSample.values[idx] ?? 0;
                  const pct = Math.min(100, Math.max(0, ((val - m.min) / (m.max - m.min)) * 100));
                  const isOptimal = val >= m.optMin && val <= m.optMax;

                  return (
                    <div key={m.symbol} className="ph-gauge-item">
                      <div className="ph-gauge-top">
                        <div className="ph-gauge-title">
                          <span className="ph-gauge-symbol">{m.symbol}</span>
                          <span className="ph-gauge-name">{m.name}</span>
                        </div>
                        <span className={`ph-gauge-status ${isOptimal ? 'is-opt' : 'is-warn'}`}>
                          {isOptimal ? t('Óptimo', 'Optimal') : t('Atención', 'Attention')}
                        </span>
                      </div>

                      <div className="ph-gauge-val-row">
                        <strong className="ph-gauge-number">
                          {val.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
                            minimumFractionDigits: m.digits,
                            maximumFractionDigits: m.digits
                          })}
                        </strong>
                        <span className="ph-gauge-unit">{m.unit}</span>
                      </div>

                      <div className="ph-gauge-bar-track">
                        <div
                          className={`ph-gauge-bar-fill ${isOptimal ? 'fill-optimal' : 'fill-warn'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="ph-gauge-scale">
                        <span>{m.min}</span>
                        <span>{m.max} {m.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ph-telemetry-foot">
                <p>
                  {t(
                    '* Muestras exportadas del reporte M-001. Ensayos sintéticos generados para demostración técnica del protocolo.',
                    '* Samples exported from report M-001. Synthetic trials generated for technical protocol demonstration.'
                  )}
                </p>
                <a className="ph-btn-primary-small" href={ART + 'informe-M001.html'} target="_blank" rel="noreferrer">
                  <span>{t('Abrir Informe de Misión M-001 (HTML)', 'Open Mission Report M-001 (HTML)')}</span>
                  <Arrow diagonal />
                </a>
              </div>
            </div>

            {/* Workflow Narrative */}
            <div className="ph-narrative-card">
              <div className="ph-narrative-intro">
                <span className="ph-kicker">03.2 // {t('FLUJO DE DATOS', 'DATA PIPELINE')}</span>
                <h3>{t('Cómo la información se convierte en acción.', 'How data translates into actionable decisions.')}</h3>
              </div>

              <div className="ph-flow-steps">
                <div className="ph-flow-step">
                  <div className="ph-step-badge">01</div>
                  <div className="ph-step-content">
                    <h4>{t('Cartografía Aérea Térmica y Multiespectral', 'Aerial Thermal & Multispectral Survey')}</h4>
                    <p>
                      {t(
                        'El dron detecta puntos calientes y variaciones anómalas de reflectancia en el dosel vegetal con precisión centimétrica.',
                        'The drone flags hot spots and reflectance anomalies in the canopy with centimeter-grade accuracy.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="ph-flow-step">
                  <div className="ph-step-badge">02</div>
                  <div className="ph-step-content">
                    <h4>{t('Inspección de Proximidad WALL-AI', 'WALL-AI Proximity Inspection')}</h4>
                    <p>
                      {t(
                        'El rover se desplaza hasta las coordenadas flagged por el dron y captura planos fotográficos de hojas, racimos y porte.',
                        'The rover navigates to drone-flagged coordinates to capture high-detail imagery of leaves, clusters and structure.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="ph-flow-step">
                  <div className="ph-step-badge">03</div>
                  <div className="ph-step-content">
                    <h4>{t('Diagnóstico Físico del Suelo INSECE', 'INSECE Physical Soil Diagnostic')}</h4>
                    <p>
                      {t(
                        'La sonda se inserta mecánicamente en la zona radicular para contrastar el aspecto aéreo con la salinidad, pH y humedad real.',
                        'The probe drives into rootzone soil to contrast canopy appearance with real salinity, pH and volumetric moisture.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="ph-flow-step">
                  <div className="ph-step-badge">04</div>
                  <div className="ph-step-content">
                    <h4>{t('Informe Integrado y Prescripción de Riego/Nutrición', 'Unified Report & Treatment Prescription')}</h4>
                    <p>
                      {t(
                        'Los datos se compilan en una ficha técnica con recomendaciones de fertirrigación dirigida, reduciendo consumo de agua e insumos.',
                        'Data compiles into an agronomic report with precise fertigation recommendations, cutting water and agrochemical waste.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap & Investor Readiness */}
      <section id="investors" className="ph-section ph-investors">
        <div className="ph-container">
          <div className="ph-section-header">
            <div>
              <span className="ph-kicker">04 / {t('HOJA DE RUTA Y DESARROLLO', 'ROADMAP & DEVELOPMENT')}</span>
              <h2>
                {t('Ingeniería rigurosa.', 'Disciplined engineering.')}
                <br />
                <span className="ph-heading-dim">{t('Validación por etapas verificables.', 'Stage-gate field validation.')}</span>
              </h2>
            </div>
            <p className="ph-header-summary">
              {t(
                'UPAIDOWN avanza sobre una arquitectura modular. Cada etapa valida componentes mecánicos, algoritmos de autonomía y sensores antes del ensamblaje del clúster final.',
                'UPAIDOWN advances on a modular architecture. Each phase validates mechanics, autonomy stacks, and sensors before final cluster assembly.'
              )}
            </p>
          </div>

          <div className="ph-milestones-grid">
            <div className="ph-milestone-card is-done">
              <div className="ph-milestone-status">
                <span className="ph-status-dot is-green" />
                <span>FASE 01 // {t('COMPLETADA', 'COMPLETED')}</span>
              </div>
              <h3>{t('Gemelo Digital & Simulación 3D', 'Digital Twin & 3D Simulation')}</h3>
              <p>
                {t(
                  'Entorno interactivo Field Cinema 3D en tiempo real, modelado cinemático de los tres equipos, simulación de cámaras térmicas y telemetría de suelo M-001.',
                  'Real-time interactive Field Cinema 3D environment, kinematic modeling of all 3 systems, thermal camera simulation and M-001 soil telemetry.'
                )}
              </p>
              <div className="ph-milestone-deliverable">
                <strong>{t('Entregable:', 'Deliverable:')}</strong> {t('Field Cinema + Informe M-001 público', 'Field Cinema + Public M-001 Report')}
              </div>
            </div>

            <div className="ph-milestone-card is-active">
              <div className="ph-milestone-status">
                <span className="ph-status-dot is-blue" />
                <span>FASE 02 // {t('EN EJECUCIÓN', 'IN PROGRESS')}</span>
              </div>
              <h3>{t('Prototipado Físico & Sensores INSECE', 'Physical Prototyping & INSECE Sensors')}</h3>
              <p>
                {t(
                  'Construcción de chasis reforzado de rover WALL-AI, calibración de bancada de 7 sensores de sonda en suelos calcáreos y validación de mecanismo de tijera Station.',
                  'Reinforced WALL-AI chassis fabrication, bench calibration of 7-sensor probe in calcareous soils, and Station scissor hoist stress-testing.'
                )}
              </p>
              <div className="ph-milestone-deliverable">
                <strong>{t('Entregable:', 'Deliverable:')}</strong> {t('Hardware de banco funcional', 'Functional bench hardware')}
              </div>
            </div>

            <div className="ph-milestone-card is-future">
              <div className="ph-milestone-status">
                <span className="ph-status-dot is-gray" />
                <span>FASE 03 // {t('PILOTO DE CAMPO', 'FIELD PILOT')}</span>
              </div>
              <h3>{t('Piloto Comercial en Parcela Real', 'Commercial Pilot on Live Vineyard')}</h3>
              <p>
                {t(
                  'Despliegue de clúster completo en finca vitivinícola asociada. Evaluación de autonomía sin supervisión, recarga solar en Station y ahorro de agua medido.',
                  'Full cluster deployment on partner vineyard estate. Unsupervised autonomy audit, Station solar recharge verification, and measured water savings.'
                )}
              </p>
              <div className="ph-milestone-deliverable">
                <strong>{t('Entregable:', 'Deliverable:')}</strong> {t('Dossier de rendimiento agronómico', 'Agronomic yield & savings dossier')}
              </div>
            </div>
          </div>

          <div className="ph-investor-briefing-box">
            <div className="ph-briefing-info">
              <div className="ph-tech-label">
                <span className="ph-pulse-beacon" />
                <span>{t('SESIÓN PRIVADA PARA INVERSORES Y PARTNERS', 'PRIVATE BRIEFING FOR INVESTORS & PARTNERS')}</span>
              </div>
              <h3>{t('Solicitar Dossier de Valoración y Modelo Pre-Money', 'Request Valuation Dossier & Pre-Money Model')}</h3>
              <p>
                {t(
                  'Disponemos de documentación ejecutiva completa, desgloses de costes de fabricación (BOM), arquitectura de software y plan financiero a 36 meses bajo acuerdo de confidencialidad.',
                  'Complete executive documentation, Bill of Materials (BOM), software architecture, and 36-month financial model available under NDA.'
                )}
              </p>
            </div>

            <div className="ph-briefing-actions">
              <a className="ph-btn-primary" href="https://upaidown.pro/demo/access">
                <span>{t('Acceso Privado / Investor Briefing', 'Private Access / Investor Briefing')}</span>
                <Arrow diagonal />
              </a>
              <a className="ph-btn-secondary" href="mailto:upaidown@gmail.com?subject=Reunión%20Inversión%20UPAIDOWN">
                <span>{t('Contactar con el Equipo Fundador', 'Contact Founding Team')}</span>
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Industrial Footer */}
      <footer className="ph-footer">
        <div className="ph-container">
          <div className="ph-footer-top">
            <div className="ph-footer-brand-col">
              <img src={ASSETS + 'brand/upaidown-official.png'} width="180" height="40" alt="UPAIDOWN" />
              <p className="ph-footer-tagline">
                {t(
                  'Ecosistema agro-robótico autónomo. Del aire a la raíz.',
                  'Autonomous agri-robotic ecosystem. From air to root.'
                )}
              </p>
            </div>

            <div className="ph-footer-nav-col">
              <h4>{t('Tecnología', 'Technology')}</h4>
              <a href="#station">UPAIDOWN Station</a>
              <a href="#sentinel">SENTINEL-V3 Drone</a>
              <a href="#wall-ai">WALL-AI Rover</a>
              <a href="#intelligence">INSECE Soil Probe</a>
            </div>

            <div className="ph-footer-nav-col">
              <h4>{t('Plataforma', 'Platform')}</h4>
              <a href={CINEMA}>Field Cinema 3D</a>
              <a href={MEDIA + 'presentacion.html'}>{t('Película Oficial', 'Official Film')}</a>
              <a href={ART + 'informe-M001.html'} target="_blank" rel="noreferrer">{t('Informe M-001', 'M-001 Report')}</a>
              <a href="https://upaidown.app">{t('Portal Clientes (CRM)', 'Client Portal (CRM)')}</a>
            </div>

            <div className="ph-footer-nav-col">
              <h4>{t('Contacto & Sedes', 'Contact & Offices')}</h4>
              <span>Madrid · España</span>
              <span>New York · Seed Outreach</span>
              <a href="mailto:upaidown@gmail.com">upaidown@gmail.com</a>
              <a href="#top" className="ph-back-top">{t('Volver arriba ↑', 'Back to top ↑')}</a>
            </div>
          </div>

          <div className="ph-footer-bottom">
            <div className="ph-footer-legal">
              <span>© 2026 UPAIDOWN Robotics. {t('Todos los derechos reservados.', 'All rights reserved.')}</span>
              <span className="ph-legal-sep">·</span>
              <span>{t('Tecnología de Simulación & Robótica de Campo', 'Simulation Tech & Field Robotics')}</span>
            </div>

            <div className="ph-footer-legal-links">
              <span>Cloud: GCP europe-west1-b</span>
              <span className="ph-legal-sep">·</span>
              <span>Production ID: ued-prod-01</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
