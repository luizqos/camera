import React, { useState } from 'react';

export function RecordingsList({ files, onRefresh, onDirectPlay, onPlaySelection, setDraggedItemsFromSelect, setPlaylist, setCurrentIndex }) {
  const [selectedUrls, setSelectedUrls] = useState([]);

  const toggleSelect = (url, e) => {
    if (e.ctrlKey || e.metaKey) {
      if (selectedUrls.includes(url)) {
        setSelectedUrls(selectedUrls.filter((item) => item !== url));
      } else {
        setSelectedUrls([...selectedUrls, url]);
      }
    } else {
      setSelectedUrls([url]);
    }
  };

  const handleDragStart = (e, file) => {
    let itemsToDrag = [];

    const fileUrl = `/recordings/${file.name}`;
    if (selectedUrls.includes(fileUrl)) {
      itemsToDrag = files
        .filter((f) => selectedUrls.includes(`/recordings/${f.name}`))
        .map((f) => ({ name: f.name, url: `/recordings/${f.name}` }));
    } else {
      itemsToDrag = [{ name: file.name, url: fileUrl }];
      setSelectedUrls([fileUrl]);
    }

    setDraggedItemsFromSelect(itemsToDrag);
    e.dataTransfer.setData('text/plain', 'from-select');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlaySelected = () => {
    if (selectedUrls.length === 0) {
      alert('Selecione pelo menos uma gravação.');
      return;
    }

    const itemsToPlay = files
      .filter((f) => selectedUrls.includes(`/recordings/${f.name}`))
      .map((f) => ({ name: f.name, url: `/recordings/${f.name}` }));

    setPlaylist(itemsToPlay);
    setCurrentIndex(0);
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">
          Gravações (Clique para selecionar, ou segure Ctrl para múltiplos):
        </label>
        
        <ul className="w-full h-48 bg-slate-900 border border-slate-700 rounded p-1 text-xs overflow-y-auto space-y-1">
          {files.length === 0 ? (
            <li className="text-slate-500 text-center py-4">Nenhuma gravação encontrada</li>
          ) : (
            files.map((file) => {
              const fileUrl = `/recordings/${file.name}`;
              const isSelected = selectedUrls.includes(fileUrl);

              return (
                <li
                  key={file.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file)}
                  onClick={(e) => toggleSelect(fileUrl, e)}
                  onDoubleClick={() => onDirectPlay(fileUrl, file.name)}
                  className={`p-1.5 rounded cursor-grab active:cursor-grabbing select-none truncate transition ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  📄 {file.name}
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePlaySelected}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded text-xs transition"
        >
          ▶ Reproduzir Fila
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded text-xs transition"
        >
          🔄 Atualizar
        </button>
      </div>
    </div>
  );
}