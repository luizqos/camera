let playlist = [];
let currentIndex = 0;
let runtimeConfig = { go2rtcPort: '1984', jsonCamera: './cameras.json', companyName: 'Monitoramento' };

// Carrega as variáveis do .env via endpoint do Nginx
async function loadRuntimeConfig() {
  try {
    const res = await fetch('/config.json');
    runtimeConfig = await res.json();
    console.log('Variáveis do .env carregadas:', runtimeConfig);
  } catch (e) {
    console.warn('Não foi possível carregar config.json, usando valores padrão.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Primeiro carrega as variáveis do .env
  await loadRuntimeConfig();

  // 2. Agora você pode usar runtimeConfig.SUA_VARIAVEL em qualquer lugar
  console.log("Porta go2rtc:", runtimeConfig.go2rtcPort);
  console.log("Nome da empresa:", runtimeConfig.companyName);

  // Exemplo: Atualizar o título H1 dinamicamente com o valor do .env
  const headerTitle = document.querySelector('h1');
  if (headerTitle && runtimeConfig.companyName) {
    headerTitle.textContent = runtimeConfig.companyName;
  }

  setupTabs();
  loadLiveCameras();
  setupPlayerEvents();
  setupRecordingSelectEvents();
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadRuntimeConfig();
  setupTabs();
  loadLiveCameras();
  setupPlayerEvents();
  setupRecordingSelectEvents();

  document.getElementById('btn-play-recordings').addEventListener('click', startPlaylistFromSelection);
  document.getElementById('btn-refresh-recordings').addEventListener('click', loadRecordingsList);
});

// Busca as configurações expostas pelo Nginx/Env
async function loadRuntimeConfig() {
  try {
    const res = await fetch('/config.json');
    runtimeConfig = await res.json();
    console.log('runtimeConfig >>>', runtimeConfig);
    
  } catch (e) {
    console.warn('Não foi possível carregar config.json, usando padrões.');
  }
}

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

async function loadLiveCameras() {
  const grid = document.getElementById('cameras-grid');
  try {
    const response = await fetch(runtimeConfig.jsonCamera);
    const cameras = await response.json();

    grid.innerHTML = '';
    cameras.forEach(cam => {
      const card = document.createElement('div');
      card.className = 'card';
      
      // Usa a porta montada dinamicamente do .env
      const streamUrl = `http://${window.location.hostname}:${runtimeConfig.go2rtcPort}/stream.html?src=${encodeURIComponent(cam.id)}&muted=1`;
      
      //console.log(">>>>>>",streamUrl);
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