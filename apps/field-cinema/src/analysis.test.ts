import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPayload,reportHtml,mapSvg} from './analysis';
import {cells,statistics,canopyStatistics} from './mission';
test('reports preserve phase gates, raw bands provenance and separate canopy statistics',()=>{assert.equal(reportPayload(20).analysis.wholePlot,null);assert.equal(reportPayload(57).soil,null);const r=reportPayload(192);assert.equal(r.analysis.wholePlot,statistics);assert.equal(r.analysis.canopy,canopyStatistics);assert.ok(r.soil);assert.equal(r.quality.gsdCm,null);assert.equal(r.missionComplete,true);const html=reportHtml(192,'');assert.ok(html.includes('No disponibles'));assert.ok(html.includes(canopyStatistics.mean.toFixed(3)));assert.ok(html.includes('Muestra sintética'));assert.ok(reportHtml(57,'').includes('Muestra pendiente'))});

test('investor report embeds branding and labels the three samples with readable channels',()=>{const html=reportHtml(192,'');assert.ok(html.includes('data:image/png;base64,'));for(const id of ['S-01','S-02','S-03'])assert.ok(html.includes(id));for(const label of ['Humedad (%)','Temperatura (°C)','Conductividad (dS/m)','N · Nitrógeno (mg/kg)'])assert.ok(html.includes(label));assert.ok(!html.includes('moisturePercent:'));assert.ok(!reportHtml(57,'').includes('S-03'));});
