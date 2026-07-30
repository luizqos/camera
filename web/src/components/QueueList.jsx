import React, { useState } from 'react';

export function QueueList({
  playlist,
  setPlaylist,
  currentIndex,
  setCurrentIndex,
  draggedItemsFromSelect,
  setDraggedItemsFromSelect,
  onPlayStart,
}) {
  const [draggedIndexInQueue, setDraggedIndexInQueue] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Ordenação
  const handleSort = (direction) => {
    if (playlist.length === 0) return;
    const currentItem = playlist[currentIndex];

    const sorted = [...playlist].sort((a, b) =>
      direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

    setPlaylist(sorted);
    if (currentItem) {
      setCurrentIndex(sorted.findIndex((item) => item.url === currentItem.url));
    }
  };

  // Drop vindo da Lista ou Reordenação da própria Fila
  const handleDrop = (e, targetIndex = null) => {
    e.preventDefault();
    setIsDragOver(false);

    // Arraste Vindo do Select
    if (draggedItemsFromSelect && draggedItemsFromSelect.length > 0) {
      const wasEmpty = playlist.length === 0;
      const newItems = draggedItemsFromSelect.filter(
        (newItem) => !playlist.some((item) => item.url === newItem.url)
      );

      const updatedPlaylist = [...playlist, ...newItems];
      setPlaylist(updatedPlaylist);
      setDraggedItemsFromSelect([]);

      if (wasEmpty && updatedPlaylist.length > 0) {
        setCurrentIndex(0);
        onPlayStart(updatedPlaylist[0]);
      }
      return;
    }

    // Reordenação Interna
    if (draggedIndexInQueue !== null && targetIndex !== null && draggedIndexInQueue !== targetIndex) {
      const updated = [...playlist];
      const [movedItem] = updated.splice(draggedIndexInQueue, 1);
      updated.splice(targetIndex, 0, movedItem);

      if (currentIndex === draggedIndexInQueue) {
        setCurrentIndex(targetIndex);
      } else if (draggedIndexInQueue < currentIndex && targetIndex >= currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (draggedIndexInQueue > currentIndex && targetIndex <= currentIndex) {
        setCurrentIndex(currentIndex + 1);
      }

      setPlaylist(updated);
      setDraggedIndexInQueue(null);
    }
  };

  const handleRemove = (indexToRemove) => {
    const updated = playlist.filter((_, idx) => idx !== indexToRemove);
    setPlaylist(updated);

    if (indexToRemove < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (indexToRemove === currentIndex && currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
      }}
      onDrop={(e) => handleDrop(e)}
      className={`p-3 rounded-lg border border-dashed transition-all ${
        isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-slate-400">Fila de Reprodução</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleSort('asc')}
            className="bg-slate-700 hover:bg-slate-600 text-[10px] px-2 py-1 rounded text-slate-200"
            title="A-Z"
          >
            ▲ Crescente
          </button>
          <button
            type="button"
            onClick={() => handleSort('desc')}
            className="bg-slate-700 hover:bg-slate-600 text-[10px] px-2 py-1 rounded text-slate-200"
            title="Z-A"
          >
            ▼ Decrescente
          </button>
        </div>
      </div>

      <ul className="space-y-1 max-h-52 overflow-y-auto min-h-[60px]">
        {playlist.length === 0 ? (
          <li className="text-slate-500 text-xs py-4 text-center">
            Nenhum vídeo na fila. Arraste ou selecione vídeos acima.
          </li>
        ) : (
          playlist.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              draggable
              onDragStart={() => setDraggedIndexInQueue(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, index);
              }}
              className={`flex justify-between items-center p-2 rounded text-xs cursor-grab border ${
                index === currentIndex
                  ? 'bg-slate-800 border-blue-500 border-l-4 text-slate-100 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span
                onClick={() => setCurrentIndex(index)}
                className="flex-1 truncate cursor-pointer"
              >
                ☰ {index === currentIndex ? '▶ ' : `${index + 1}. `} {item.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-red-400 hover:bg-red-500/20 px-1.5 py-0.5 rounded text-xs ml-2 font-bold"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}