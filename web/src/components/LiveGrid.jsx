import React, { useEffect, useState } from 'react';

export function LiveGrid() {
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(false);

  const go2rtcPort = import.meta.env.VITE_GO2RTC_PORT || '1984';
  const publishIn = import.meta.env.VITE_PUBLISH_IN || 'SERVER';

  const isLocal = publishIn?.toUpperCase() === 'LOCAL';
  const baseUrl = isLocal
    ? `http://${window.location.hostname}:${go2rtcPort}`
    : `https://${window.location.hostname}/go2rtc`;

  useEffect(() => {
    fetch('/cameras.json')
      .then((res) => res.json())
      .then((data) => setCameras(data))
      .catch((err) => {
        console.error('Erro ao carregar câmeras:', err);
        setError(true);
      });
  }, []);

  if (error) {
    return <p className="text-red-400 text-center py-8">Erro ao carregar transmissões ao vivo.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1600px] mx-auto">
      {cameras.map((cam) => {
        const isExternalWeb = Boolean(cam.url) && cam.type?.toUpperCase() === 'EXTERNA';

        const streamUrl = isExternalWeb
          ? cam.url
          : `${baseUrl}/stream.html?src=${encodeURIComponent(cam.id)}&muted=1`;

        return (
          <div key={cam.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
            <div className="bg-slate-950 px-3 py-2 text-xs font-semibold flex justify-between items-center border-b border-slate-800">
              <span>{cam.name}</span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 
                {isExternalWeb ? 'Web Live' : 'Ao Vivo'}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-black">
              <iframe 
                src={streamUrl} 
                className="absolute inset-0 w-full h-full border-0" 
                allow="autoplay; fullscreen" 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}