let playlist = [];
let currentIndex = 0;
let draggedIndex = null;

async function loadRuntimeConfig() {
  try {
    const res = await fetch('/config.json');
    return await res.json();
  } catch (e) {
    console.warn('Não foi possível carregar config.json, usando valores padrão.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const configRuntime = await loadRuntimeConfig();
  setupTabs();
  loadLiveCameras(configRuntime);
  setupPlayerEvents();
  setupRecordingSelectEvents();
  setupQueueOrderEvents();

  document.getElementById('btn-play-recordings').addEventListener('click', startPlaylistFromSelection);
  document.getElementById('btn-refresh-recordings').addEventListener('click', loadRecordingsList);
});

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
      
      const isLocal = placeOfExecution.toUpperCase() === 'LOCAL';
      const path = isLocal ? `:${go2rtcPort}` : '/go2rtc';
      const protocol = isLocal ? `http` : 'https';

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

function renderQueueUI() {
  const queueList = document.getElementById('queue-items-list');
  queueList.innerHTML = '';

  playlist.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'queue-item';

    if (index === currentIndex) {
      li.classList.add('playing');
      li.innerHTML = `▶ <strong>${escapeHtml(item.name)}</strong>`;
    } else {
      li.innerHTML = `${index + 1}. ${escapeHtml(item.name)}`;
      li.addEventListener('click', () => {
        currentIndex = index;
        playCurrentVideo();
      });
    }

    queueList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}

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

function renderQueueUI() {
  const queueList = document.getElementById('queue-items-list');
  const queueStatus = document.getElementById('queue-status');

  queueList.innerHTML = '';
  
  if (playlist.length > 0) {
    queueStatus.textContent = `Fila: ${currentIndex + 1}/${playlist.length}`;
  } else {
    queueStatus.textContent = 'Fila: 0/0';
  }

  playlist.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.setAttribute('draggable', 'true');
    li.dataset.index = index;

    if (index === currentIndex) {
      li.classList.add('playing');
      li.innerHTML = `☰ ▶ <strong>${escapeHtml(item.name)}</strong> (Tocando)`;
    } else {
      li.innerHTML = `☰ ${index + 1}. ${escapeHtml(item.name)}`;
      li.addEventListener('click', (e) => {
        if (!li.classList.contains('dragging')) {
          currentIndex = index;
          playCurrentVideo();
        }
      });
    }

    li.addEventListener('dragstart', (e) => {
      draggedIndex = index;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedIndex = null;
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = index;

      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const movedItem = playlist.splice(draggedIndex, 1)[0];
        playlist.splice(targetIndex, 0, movedItem);

        if (currentIndex === draggedIndex) {
          currentIndex = targetIndex;
        } else if (draggedIndex < currentIndex && targetIndex >= currentIndex) {
          currentIndex--;
        } else if (draggedIndex > currentIndex && targetIndex <= currentIndex) {
          currentIndex++;
        }

        renderQueueUI();
      }
    });

    queueList.appendChild(li);
  });
}