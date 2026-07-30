import React from 'react';

export function RecordingsList({ files, onRefresh, onDirectPlay, setDraggedItemsFromSelect }) {
  const handleDragStart = (e) => {
    const select = e.target.parentElement;
    const selectedOptions = Array.from(select.selectedOptions).filter((opt) => !opt.disabled);

    const itemsToDrag = selectedOptions.map((opt) => ({
      name: opt.textContent,
      url: opt.value,
    }));

    setDraggedItemsFromSelect(itemsToDrag);
    e.dataTransfer.setData('text/plain', 'from-select');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">
          Selecione uma ou mais gravações (Ctrl/Cmd):
        </label>
        <select
          multiple
          size={8}
          className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
          onDoubleClick={(e) => {
            if (e.target.tagName === 'OPTION' && !e.target.disabled) {
              onDirectPlay(e.target.value, e.target.textContent);
            }
          }}
        >
          {files.length === 0 ? (
            <option disabled>Nenhuma gravação encontrada</option>
          ) : (
            files.map((file) => (
              <option
                key={file.name}
                value={`/recordings/${file.name}`}
                draggable
                onDragStart={handleDragStart}
                className="p-1.5 border-b border-slate-800 hover:bg-slate-800 cursor-grab active:cursor-grabbing"
              >
                {file.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded text-xs transition"
        >
          🔄 Atualizar Lista
        </button>
      </div>
    </div>
  );
}