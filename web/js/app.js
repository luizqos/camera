// Estado da Fila de Reprodução
let playlist = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadLiveCameras();
  setupPlayerEvents();

  document.getElementById('btn-play-recordings').addEventListener('click', startPlaylist);
  document.getElementById('btn-refresh-recordings').addEventListener('click', loadRecordingsList);
});

// --- GERENCIAMENTO DE ABAS ---
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

// --- CÂMERAS AO VIVO ---
async function loadLiveCameras() {
  const grid = document.getElementById('cameras-grid');
  try {
    const response = await fetch('/cameras.json');
    const cameras = await response.json();

    grid.innerHTML = '';
    cameras.forEach(cam => {
      const card = document.createElement('div');
      card.className = 'card';
      const streamUrl = `http://${window.location.hostname}:1984/stream.html?src=${encodeURIComponent(cam.id)}&muted=1`;

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

// --- VISUALIZADOR DE GRAVAÇÕES E FILA ---
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

    // Ordena do mais recente para o mais antigo
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

function setupPlayerEvents() {
  const player = document.getElementById('single-record-player');

  // Evento nativo do HTML5 Video: dispara quando o vídeo atual termina
  player.addEventListener('ended', () => {
    if (currentIndex + 1 < playlist.length) {
      currentIndex++;
      playCurrentVideo();
    }
  });
}

function startPlaylist() {
  const select = document.getElementById('recording-select');
  const selectedOptions = Array.from(select.selectedOptions);

  if (selectedOptions.length === 0) {
    alert('Selecione pelo menos um arquivo na lista.');
    return;
  }

  // Cria a playlist com os itens selecionados
  playlist = selectedOptions.map(opt => ({
    name: opt.textContent,
    url: opt.value
  }));

  currentIndex = 0;
  renderQueueUI();
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
      li.innerHTML = `▶ <strong>${escapeHtml(item.name)}</strong> (Tocando)`;
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