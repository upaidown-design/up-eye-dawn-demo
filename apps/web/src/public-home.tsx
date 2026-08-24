import {Link} from 'react-router-dom';

const capabilities = [
  ['FIXED', 'Sentinel field node', 'Persistent field presence and environmental context.'],
  ['AERIAL', 'Autonomous survey', 'Structured observation across the agricultural site.'],
  ['GROUND', 'Rover investigation', 'Terrestrial inspection and soil ground truth.'],
  ['DATA', 'Field intelligence', 'A versioned evidence layer for analysis and decisions.'],
] as const;

export function PublicHome() {
  return <main className="public-home">
    <nav className="public-nav" aria-label="Public navigation">
      <Link className="public-wordmark" to="/">UP AI DOWN</Link>
      <div><Link to="/transparency">Demo transparency</Link><Link className="public-team" to="/admin/login">Team access</Link></div>
    </nav>
    <section className="public-hero">
      <div className="public-hero-media" role="img" aria-label="UP AI DOWN autonomous agricultural field intelligence concept">
        <img src="/demo/assets/concepts/generated-2026-08-16/ecosystem-hero.png" alt="Concept visualization of the Sentinel, rover and drone system in an agricultural field"/>
      </div>
      <div className="public-hero-copy">
        <p>AUTONOMOUS FIELD INTELLIGENCE</p>
        <h1>Observe from the air.<br/>Verify on the ground.</h1>
        <span>UP AI DOWN is developing an integrated agritech system that connects fixed sensing, aerial observation, autonomous ground investigation and a common data layer.</span>
        <div className="public-access-note"><b>PRIVATE INVESTOR ROOM</b><p>Investor materials are invitation-only. Open the personal secure link sent by the project team; every recipient must create an individual record and complete the assigned NDA.</p></div>
      </div>
    </section>
    <section className="public-capabilities" aria-label="System layers">
      {capabilities.map(([index, title, body]) => <article key={index}><small>{index}</small><h2>{title}</h2><p>{body}</p></article>)}
    </section>
    <footer className="public-footer"><span>CONCEPT-LED PRODUCT DEVELOPMENT</span><p>Public product overview. Hardware imagery is concept visualization; private demo data and mission outputs are simulated unless expressly identified otherwise.</p><Link to="/admin/login">Administrator sign in</Link></footer>
  </main>;
}
