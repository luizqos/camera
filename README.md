# 📹 Painel de Monitoramento de Câmeras IP (React + go2rtc + FFmpeg)

Sistema completo de monitoramento, gravação contínua e gerenciamento de armazenamento para câmeras de segurança IP (RTSP). Conta com painel web responsivo em React/Tailwind, retransmissão via WebRTC/MSE e rotinas automáticas de gravação/expurgo de vídeos em contêineres Docker.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS (Build Multi-Stage no Docker)
- **Servidor Web / Proxy:** Nginx Alpine
- **Streaming de Vídeo:** [go2rtc](https://github.com/AlexxIT/go2rtc) (WebRTC / MSE / RTSP)
- **Gravação e Expurgo:** FFmpeg (Alpine) + Shell Script com `jq`
- **Orquestração:** Docker Compose

---

## 📁 Estrutura do Projeto

```text
.
├── cameras.json             # Cadastro das câmeras IP e flag de gravação
├── docker-compose.yml       # Subida dos serviços para ambiente local / produção
├── docker-compose-server.yml# Configuração específica para deploy no servidor
├── Dockerfile               # Build da imagem do serviço gravador/cleaner
├── entrypoint-recorder.sh   # Script de gravação contínua em loop e rotação de disco
├── go2rtc.yaml              # Configuração dos feeds RTSP no go2rtc
├── nginx.conf               # Servidor estático e roteamento de APIs e streams
├── .env                     # Variáveis de ambiente
├── env.example              # Modelo de variáveis de ambiente
└── web/                     # Aplicação Frontend em React
    ├── Dockerfile           # Multi-stage build (Node.js -> Nginx)
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx          # Componente principal e reprodutor com velocidade
        ├── main.jsx
        ├── index.css
        └── components/
            ├── LiveGrid.jsx         # Grade de câmeras ao vivo
            ├── RecordingsList.jsx   # Seleção de arquivos e Drag & Drop
            └── QueueList.jsx        # Fila de reprodução e reordenação
```


## ⚙️ Variáveis de Ambiente (`.env`)

Copie o arquivo modelo para criar a sua configuração local:

```
cp env.example .env

```
| Variável | Descrição | Exemplo Padrão |
| :--- | :--- | :--- |
| `WEB_PORT` | Porta HTTP para acessar a aplicação Web no navegador | `8005` |
| `VITE_GO2RTC_PORT` | Porta de API do servidor go2rtc | `1984` |
| `VITE_PUBLISH_IN` | Local de execução da aplicação | `LOCAL` |
| `RECORD_PATH` | Pasta local onde as gravações ativas ( `.mp4` ) serão salvas | `./record` |
| `ARCHIVE_PATH` | Pasta/disco secundário para onde vídeos velhos serão movidos | `/mnt/Cameras` |
| `MAX_STORAGE_GB` | Espaço máximo alocado para a pasta de gravações (em GB) | `100` |
| `TRIGGER_PERCENT` | Porcentagem ocupada do limite para disparar a limpeza | `80` (80% de 100GB) |
| `PURGE_PERCENT` | Porcentagem do limite de espaço a ser liberada na limpeza | `30` (30% de 100GB) |
| `CLEANUP_ACTION` | Ação ao atingir o limite: `MOVE` (move para `ARCHIVE_PATH` ) ou `DELETE` | `MOVE` |
| `CLEANUP_TIME` | Intervalo em horas para verificar a cota do disco | `12` |

## 📹 Configurando Câmeras (`cameras.json`)

Edite o arquivo `cameras.json` na raiz do projeto para definir as câmeras que serão exibidas na interface e quais devem ser gravadas:

```
[
  {
    "id": "camera_garagem",
    "name": "Câmera 01 - Garagem",
    "url": "rtsp://usuario:senha@192.168.1.50:554/stream1",
    "record": true
  }
]

```

⚠️ **Nota:** A propriedade `id` deve coincidir exatamente com a chave configurada no arquivo `go2rtc.yaml`.

## 🚀 Como Executar o Projeto

### Rodando via Docker (Recomendado para Produção/Uso)

Suba toda a pilha de contêineres construindo os builds necessários:

Bash

```
# Subir com o Compose padrão:
docker compose up -d --build

# Ou utilizando a versão server:
docker compose -f docker-compose-server.yml up -d --build

```

Acesse a interface pelo navegador no endereço: **`http://localhost:8005`**


### Rodando o Frontend em Desenvolvimento Local (com Hot Reload)

Para fazer alterações e testar a interface em tempo real:

1.  **Suba apenas os serviços de backend (go2rtc e gravador):**
    
   
    ```
    docker compose up -d go2rtc gravador
    
    ```
    
2.  **Inicie o servidor de desenvolvimento do Vite:**
    
    ```
    cd web
    npm install
    npm run dev
    
    ```
    
3.  Acesse a aplicação em **`http://localhost:3000`**. As chamadas de vídeo e gravações serão redirecionadas via proxy para a porta `8005`.

## 🎬 Funcionalidades da Interface Web

1.  **🔴 Transmissão Ao Vivo:**
    
    -   Grid dinâmico baseado no arquivo `cameras.json`.
        
    -   Baixa latência utilizando players embutidos do `go2rtc` (WebRTC/MSE).
        
2.  **📁 Gerenciador de Gravações:**
    
    -   **Lista de Seleção Múltipla:** Permite selecionar um ou vários arquivos usando clique simples ou mantendo `Ctrl/Cmd` pressionado.
        
    -   **Drag & Drop:** Arraste um ou múltiplos vídeos da lista e solte diretamente dentro do container da **Fila de Reprodução**.
        
    -   **Controle de Fila:** Botões para reordenar a fila em ordem Crescente (A-Z) ou Decrescente (Z-A) com apenas um clique.
        
    -   **Reprodutor Único com Controle de Velocidade:** Alterne a velocidade de exibição em tempo real (`0.25x`, `0.5x`, `1x`, `2x` e `4x`) diretamente no cabeçalho do player.
        

## 🛠️ Comandos Úteis

-   **Visualizar logs do frontend (Nginx):**

    ```
    docker logs -f painel_cameras_web
    
    ```
    
-   **Visualizar logs do processo de gravação e limpeza de disco:**
    
    ```
    docker logs -f gravador_cameras
    
    ```
    
-   **Reiniciar os contêineres após alterações de configuração:**
    
    ```
    docker compose restart
    ```