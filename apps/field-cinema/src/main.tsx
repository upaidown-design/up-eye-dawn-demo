import React from 'react';
import {createRoot} from 'react-dom/client';
import {FieldCinema} from './FieldCinema';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><FieldCinema/></React.StrictMode>);
