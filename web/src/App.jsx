import React, { useEffect, useRef, useState } from 'react';
import { LiveGrid } from './components/LiveGrid';
import { RecordingsList } from './components/RecordingsList';
import { QueueList } from './components/QueueList';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [config, setConfig] = useState(null);
  const [recordingsFiles, setRecordingsFiles] = useState([]);
  
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draggedItemsFromSelect, setDraggedItemsFromSelect] = useState([]);

  const [playbackRate, setPlaybackRate] = useState(1);

  const playerRef = useRef(null);

  useEffect(() => {
    fetch('/config.json')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({ go2rtcPort: '1984', jsonCamera: '/cameras.json', placeOfExecution: 'LOCAL' }));
  }, []);

  const fetchRecordings = () => {
    fetch('/recordings/')
      .then((res) => res.json())
      .then((files) => {
        const mp4Files = files.filter((f) => f.name.endsWith('.mp4'));
        mp4Files.sort((a, b) => b.name.localeCompare(a.name));
        setRecordingsFiles(mp4Files);
      })
      .catch((err) => console.error('Erro ao buscar gravações:', err));
  };

  useEffect(() => {
    if (activeTab === 'recordings') {
      fetchRecordings();
    }
  }, [activeTab]);

  const handleVideoEnded = () => {
    if (currentIndex + 1 < playlist.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const playVideo = (item) => {
    if (playerRef.current && item) {
      playerRef.current.src = item.url;
      playerRef.current.playbackRate = playbackRate;
      playerRef.current.play().catch((err) => console.log('Autoplay bloqueado:', err));
    }
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    if (playlist.length > 0 && playlist[currentIndex]) {
      playVideo(playlist[currentIndex]);
    }
  }, [currentIndex, playlist]);

  const handleDirectPlay = (url, name) => {
    const newItem = { name, url };
    setPlaylist([newItem]);
    setCurrentIndex(0);
  };

  const currentVideoName = playlist[currentIndex]?.name || 'Nenhum vídeo selecionado';
  const speedOptions = [0.25, 0.5, 1, 2, 4];

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header e Abas */}
      <header className="flex flex-wrap justify-between items-center mb-5 pb-3 border-b border-slate-800 gap-3">
        <h1 className="text-lg font-bold text-slate-100">Sistema de Monitoramento</h1>
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition ${
              activeTab === 'live' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🔴 Ao Vivo
          </button>
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition ${
              activeTab === 'recordings' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📁 Gravações
          </button>
        </nav>
      </header>

      {/* Conteúdo Aba 1: Ao Vivo */}
      {activeTab === 'live' && <LiveGrid config={config} />}

      {/* Conteúdo Aba 2: Gravações */}
      {activeTab === 'recordings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Player Único à Esquerda */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-lg flex flex-col">
            <div className="bg-slate-950 px-4 py-2.5 text-xs font-semibold flex flex-wrap justify-between items-center border-b border-slate-800 gap-2">
              <span className="truncate max-w-[250px] sm:max-w-xs">🎬 {currentVideoName}</span>

              <div className="flex items-center gap-3">
                {/* --- SELETOR DE VELOCIDADE (0.25x até 4x) --- */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 px-1 font-normal">Velocidade:</span>
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition ${
                        playbackRate === rate
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <span className="bg-slate-800 text-sky-400 px-2 py-0.5 rounded text-[11px]">
                  Fila: {playlist.length > 0 ? `${currentIndex + 1}/${playlist.length}` : '0/0'}
                </span>
              </div>
            </div>

            <div className="relative w-full aspect-video bg-black flex-1">
              <video
                ref={playerRef}
                controls
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta vídeos MP4.
              </video>
            </div>
          </div>

          {/* Painel de Seleção e Fila à Direita */}
          <div className="flex flex-col gap-4">
            <RecordingsList
              files={recordingsFiles}
              onRefresh={fetchRecordings}
              onDirectPlay={handleDirectPlay}
              setDraggedItemsFromSelect={setDraggedItemsFromSelect}
              setPlaylist={setPlaylist}
              setCurrentIndex={setCurrentIndex}
            />

            <QueueList
              playlist={playlist}
              setPlaylist={setPlaylist}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              draggedItemsFromSelect={draggedItemsFromSelect}
              setDraggedItemsFromSelect={setDraggedItemsFromSelect}
              onPlayStart={playVideo}
            />
          </div>
        </div>
      )}
    </div>
  );
}