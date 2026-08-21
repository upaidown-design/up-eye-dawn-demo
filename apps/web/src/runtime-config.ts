export const runtimeConfig={
  apiBase:(import.meta.env.VITE_API_BASE??'/api/v1').replace(/\/$/,''),
  websocketPath:import.meta.env.VITE_WEBSOCKET_PATH??'/socket.io',
} as const;

export function websocketUrl(){
  const url=new URL(runtimeConfig.websocketPath,window.location.origin);
  url.protocol=window.location.protocol==='https:'?'wss:':'ws:';
  return url.toString();
}
