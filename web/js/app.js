// ==============================================================================
// VARIÁVEIS GLOBAIS
// ==============================================================================
let playlist = [];
let currentIndex = 0;

// Variáveis de controle para o Drag & Drop
let draggedItemsFromSelect = [];
let draggedIndexInQueue = null;

// ==============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==============================================================================
async function loadRuntimeConfig() {
  try {
    const res = await fetch('/config.json');
    return await res.json();
  } catch (e) {
    console.warn('Não foi possível carregar config.json, usando valores padrão.');
    return { go2rtcPort: '1984', jsonCamera: '/cameras.json', placeOfExecution: 'LOCAL' };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const configRuntime = await loadRuntimeConfig();
  setupTabs();
  loadLiveCameras(configRuntime);
  setupPlayerEvents();
  setupRecordingSelectEvents();
  setupQueueOrderEvents();
  setupQueueDropZone();

  document.getElementById('btn-play-recordings').addEventListener('click', startPlaylistFromSelection);
  document.getElementById('btn-refresh-recordings').addEventListener('click', loadRecordingsList);
});

// ==============================================================================
// ABAS E CÂMERAS AO VIVO
// ==============================================================================
function setupTabs() {
  const btnLive = document.getElementById('tab-live');
  const btnRecordings = document.getElementById('tab-recordings');
  const viewLive = document.getElementById('view-live');
  const viewRecordings = document.getElementById('view-recordings');

  btnLive.addEventListener('click', () => {
    btnLive.classList.add('active');
    btnRecordings.classList.remove('active');
    viewLive.classList.add('active');
    viewRecordings.classList.remove('active');
  });

  btnRecordings.addEventListener('click', () => {
    btnRecordings.classList.add('active');
    btnLive.classList.remove('active');
    viewRecordings.classList.add('active');
    viewLive.classList.remove('active');
    loadRecordingsList();
  });
}

async function loadLiveCameras(configRuntime) {
  const { go2rtcPort, jsonCamera, placeOfExecution } = configRuntime;
  const grid = document.getElementById('cameras-grid');
  try {
    const response = await fetch(`${jsonCamera}`);
    const cameras = await response.json();

    grid.innerHTML = '';
    cameras.forEach(cam => {
      const card = document.createElement('div');
      card.className = 'card';
      
      const isLocal = placeOfExecution && placeOfExecution.toUpperCase() === 'LOCAL';
      const path = isLocal ? `:${go2rtcPort}` : '/go2rtc';
      const protocol = isLocal ? 'http' : 'https';

      const streamUrl = `${protocol}://${window.location.hostname}${path}/stream.html?src=${encodeURIComponent(cam.id)}&muted=1`;

      card.innerHTML = `
        <div class="card-header">
          <span>${escapeHtml(cam.name)}</span>
          <div class="status"><span class="status-dot"></span> Ao Vivo</div>
        </div>
        <div class="video-wrapper">
          <iframe src="${streamUrl}" allow="autoplay; fullscreen"></iframe>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao carregar câmeras:', err);
    grid.innerHTML = '<p class="error-msg">Erro ao carregar transmissões ao vivo.</p>';
  }
}

// ==============================================================================
// CARREGAMENTO E EVENTOS DA LISTA DE GRAVAÇÕES
// ==============================================================================
async function loadRecordingsList() {
  const select = document.getElementById('recording-select');
  try {
    const response = await fetch('/recordings/');
    const files = await response.json();

    select.innerHTML = '';
    const mp4Files = files.filter(file => file.name.endsWith('.mp4'));

    if (mp4Files.length === 0) {
      select.innerHTML = '<option disabled>Nenhuma gravação encontrada</option>';
      return;
    }

    mp4Files.sort((a, b) => b.name.localeCompare(a.name));

    mp4Files.forEach(file => {
      const option = document.createElement('option');
      option.value = `/recordings/${file.name}`;
      option.textContent = file.name;

      option.setAttribute('draggable', 'true');

      option.addEventListener('dragstart', (e) => {
        const selectedOptions = Array.from(select.selectedOptions).filter(opt => !opt.disabled);
        
        if (selectedOptions.includes(option)) {
          draggedItemsFromSelect = selectedOptions.map(opt => ({ name: opt.textContent, url: opt.value }));
        } else {
          draggedItemsFromSelect = [{ name: option.textContent, url: option.value }];
        }

        draggedIndexInQueue = null;
        e.dataTransfer.setData('text/plain', 'from-select');
        e.dataTransfer.effectAllowed = 'copy';
      });

      select.appendChild(option);
    });
  } catch (err) {
    console.error('Erro ao carregar lista de gravações:', err);
  }
}

function setupRecordingSelectEvents() {
  const select = document.getElementById('recording-select');
  select.addEventListener('dblclick', (e) => {
    if (e.target && e.target.tagName === 'OPTION' && !e.target.disabled) {
      playSingleRecordingDirectly(e.target.value, e.target.textContent);
    }
  });
}

// ==============================================================================
// PLAYER DE VÍDEO E FILA DE REPRODUÇÃO
// ==============================================================================
function setupPlayerEvents() {
  const player = document.getElementById('single-record-player');
  player.addEventListener('ended', () => {
    if (currentIndex + 1 < playlist.length) {
      currentIndex++;
      playCurrentVideo();
    }
  });
}

function playSingleRecordingDirectly(url, name) {
  playlist = [{ name, url }];
  currentIndex = 0;
  playCurrentVideo();
}

function startPlaylistFromSelection() {
  const select = document.getElementById('recording-select');
  const selectedOptions = Array.from(select.selectedOptions).filter(opt => !opt.disabled);

  if (selectedOptions.length === 0) {
    alert('Selecione pelo menos um arquivo na lista.');
    return;
  }

  playlist = selectedOptions.map(opt => ({
    name: opt.textContent,
    url: opt.value
  }));

  currentIndex = 0;
  playCurrentVideo();
}

function playCurrentVideo() {
  const player = document.getElementById('single-record-player');
  const title = document.getElementById('current-video-title');
  const queueStatus = document.getElementById('queue-status');

  if (playlist.length === 0 || !playlist[currentIndex]) return;

  const currentItem = playlist[currentIndex];
  player.src = currentItem.url;
  title.textContent = `🎬 ${currentItem.name}`;
  queueStatus.textContent = `Fila: ${currentIndex + 1}/${playlist.length}`;

  player.play().catch(err => console.log('Autoplay bloqueado pelo navegador:', err));
  renderQueueUI();
}

// ==============================================================================
// DRAG & DROP E ZONA DE SOLTURA DA FILA
// ==============================================================================
function setupQueueDropZone() {
  const queueWrapper = document.querySelector('.queue-list-wrapper');

  queueWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    queueWrapper.classList.add('drag-over');
    e.dataTransfer.dropEffect = draggedIndexInQueue !== null ? 'move' : 'copy';
  });

  queueWrapper.addEventListener('dragleave', (e) => {
    if (!queueWrapper.contains(e.relatedTarget)) {
      queueWrapper.classList.remove('drag-over');
    }
  });

  queueWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    queueWrapper.classList.remove('drag-over');

    if (draggedItemsFromSelect && draggedItemsFromSelect.length > 0) {
      const wasEmpty = playlist.length === 0;

      draggedItemsFromSelect.forEach(newItem => {
        if (!playlist.some(item => item.url === newItem.url)) {
          playlist.push(newItem);
        }
      });

      draggedItemsFromSelect = [];

      renderQueueUI();

      if (wasEmpty && playlist.length > 0) {
        currentIndex = 0;
        playCurrentVideo();
      }
    }
  });
}

function renderQueueUI() {
  const queueList = document.getElementById('queue-items-list');
  const queueStatus = document.getElementById('queue-status');

  queueList.innerHTML = '';
  
  if (playlist.length > 0) {
    queueStatus.textContent = `Fila: ${currentIndex + 1}/${playlist.length}`;
  } else {
    queueStatus.textContent = 'Fila: 0/0';
    queueList.innerHTML = '<li class="empty-queue">Nenhum vídeo na fila. Arraste ou selecione vídeos acima.</li>';
    return;
  }

  playlist.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.setAttribute('draggable', 'true');
    li.dataset.index = index;

    if (index === currentIndex) {
      li.classList.add('playing');
      li.innerHTML = `
        <span class="item-title">☰ ▶ <strong>${escapeHtml(item.name)}</strong></span>
        <button class="btn-remove" title="Remover da fila">✕</button>
      `;
    } else {
      li.innerHTML = `
        <span class="item-title">☰ ${index + 1}. ${escapeHtml(item.name)}</span>
        <button class="btn-remove" title="Remover da fila">✕</button>
      `;
    }

    li.querySelector('.item-title').addEventListener('click', () => {
      currentIndex = index;
      playCurrentVideo();
    });

    li.querySelector('.btn-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromPlaylist(index);
    });

    li.addEventListener('dragstart', (e) => {
      draggedIndexInQueue = index;
      draggedItemsFromSelect = [];
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedIndexInQueue = null;
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetIndex = index;

      if (draggedIndexInQueue !== null && draggedIndexInQueue !== targetIndex) {
        const movedItem = playlist.splice(draggedIndexInQueue, 1)[0];
        playlist.splice(targetIndex, 0, movedItem);

        if (currentIndex === draggedIndexInQueue) {
          currentIndex = targetIndex;
        } else if (draggedIndexInQueue < currentIndex && targetIndex >= currentIndex) {
          currentIndex--;
        } else if (draggedIndexInQueue > currentIndex && targetIndex <= currentIndex) {
          currentIndex++;
        }

        renderQueueUI();
      }
    });

    queueList.appendChild(li);
  });
}

function removeFromPlaylist(indexToRemove) {
  playlist.splice(indexToRemove, 1);

  if (playlist.length === 0) {
    currentIndex = 0;
    const player = document.getElementById('single-record-player');
    player.pause();
    player.src = '';
    document.getElementById('current-video-title').textContent = 'Nenhum vídeo selecionado';
  } else if (indexToRemove < currentIndex) {
    currentIndex--;
  } else if (indexToRemove === currentIndex) {
    if (currentIndex >= playlist.length) {
      currentIndex = 0;
    }
    playCurrentVideo();
  }

  renderQueueUI();
}

// ==============================================================================
// ORDENAÇÃO E UTILITÁRIOS
// ==============================================================================
function setupQueueOrderEvents() {
  const btnAsc = document.getElementById('btn-sort-asc');
  const btnDesc = document.getElementById('btn-sort-desc');

  if (btnAsc) {
    btnAsc.addEventListener('click', () => sortPlaylist('asc'));
  }
  if (btnDesc) {
    btnDesc.addEventListener('click', () => sortPlaylist('desc'));
  }
}

function sortPlaylist(direction) {
  if (playlist.length === 0) return;

  const currentItem = playlist[currentIndex];

  playlist.sort((a, b) => {
    if (direction === 'asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  if (currentItem) {
    currentIndex = playlist.findIndex(item => item.url === currentItem.url);
  }

  renderQueueUI();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}