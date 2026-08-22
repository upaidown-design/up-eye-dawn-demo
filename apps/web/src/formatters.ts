export function formatValue(value: number, kind: 'currency' | 'percent' | 'area' | 'speed' | 'temperature' | 'ec' | 'number' = 'number', locale = 'en-US') {
  if (kind === 'currency') return new Intl.NumberFormat(locale, {style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1}).format(value);
  if (kind === 'percent') return `${new Intl.NumberFormat(locale, {maximumFractionDigits: 1}).format(value)}%`;
  const unit = {area: ' ha', speed: ' m/s', temperature: ' °C', ec: ' dS/m', number: ''}[kind];
  return `${new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(value)}${unit}`;
}
