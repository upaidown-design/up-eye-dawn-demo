import React from 'react';
import {createRoot} from 'react-dom/client';
import {PublicHome} from './public-home';
import './public-home.css';

// The public landing does not load the internal portal, maps or 3D engine.
if (/^\/demo\/?$/.test(window.location.pathname)) {
  createRoot(document.getElementById('root')!).render(<React.StrictMode><PublicHome/></React.StrictMode>);
} else {
  void import('./internal-main').catch(() => {
    const root = document.getElementById('root');
    if (root) {
      root.textContent = 'No se ha podido cargar la aplicación. ';
      const retry = document.createElement('a');
      retry.href = window.location.href;
      retry.textContent = 'Volver a intentar';
      root.append(retry);
    }
  });
}
