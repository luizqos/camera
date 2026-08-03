#!/bin/sh

DEST_DIR="/record"
ARCHIVE_DIR="/archive"
CONFIG_FILE="/cameras.json"
TMP_REC_FILE="/tmp/cameras_to_record.json"

# Lê as variáveis enviadas pelo Docker Compose / .env (com fallback)
MAX_STORAGE_GB="${MAX_STORAGE_GB:-11}"
TRIGGER_PERCENT="${TRIGGER_PERCENT:-80}"
PURGE_PERCENT="${PURGE_PERCENT:-30}"
CLEANUP_ACTION="${CLEANUP_ACTION:-MOVE}"
CLEANUP_TIME="${CLEANUP_TIME:-2}"

# Função helper para padronizar os logs com data/hora
log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') $1"
}

log "[System] =========================================="
log "[System] Iniciando Script de Gravação e Limpeza"
log "[System] =========================================="

# Exibição de Configurações do Ambiente
echo -e "VARIÁVEL\tVALOR
DEST_DIR\t${DEST_DIR}
ARCHIVE_DIR\t${ARCHIVE_DIR}
CONFIG_FILE\t${CONFIG_FILE}
TMP_REC_FILE\t${TMP_REC_FILE}
MAX_STORAGE_GB\t${MAX_STORAGE_GB} GB
TRIGGER_PERCENT\t${TRIGGER_PERCENT}%
PURGE_PERCENT\t${PURGE_PERCENT}%
CLEANUP_ACTION\t${CLEANUP_ACTION}
CLEANUP_TIME\t${CLEANUP_TIME}h" | column -t -s $'\t'

echo ""
log "[System] Criando/Verificando diretórios locais..."
mkdir -p "${DEST_DIR}"
log "[System] Diretório de gravações verificado: ${DEST_DIR}"

if [ "$CLEANUP_ACTION" = "MOVE" ]; then
  mkdir -p "${ARCHIVE_DIR}" 2>/dev/null
  log "[System] Ação definida como MOVE. Diretório de arquivo: ${ARCHIVE_DIR}"
fi

log "[System] Validando arquivo de configuração em: ${CONFIG_FILE}"
if [ ! -f "$CONFIG_FILE" ]; then
  log "[System] [ERRO CRÍTICO] Arquivo $CONFIG_FILE não encontrado! Encerrando execução."
  exit 1
fi
log "[System] Arquivo de configuração $CONFIG_FILE encontrado com sucesso."

# -----------------------------------------------------------------------------
# Função de Gravação por Stream
# -----------------------------------------------------------------------------
gravar_stream() {
  STREAM_ID=$1
  RTSP_URL=$2

  log "[Recorder][$STREAM_ID] Thread de gravação inicializada."

  while true; do
    TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
    OUTPUT_FILE="${DEST_DIR}/${STREAM_ID}_${TIMESTAMP}.mp4"

    log "[Recorder][$STREAM_ID] Disparando FFmpeg -> Arquivo: ${OUTPUT_FILE}"

    ffmpeg -hide_banner -loglevel error \
      -avoid_negative_ts make_zero \
      -fflags +genpts+discardcorrupt \
      -use_wallclock_as_timestamps 1 \
      -rtsp_flags prefer_tcp \
      -rtsp_transport tcp \
      -i "${RTSP_URL}" \
      -c:v copy \
      -c:a aac \
      -fs 104857600 \
      "${OUTPUT_FILE}" 2>&1 | grep -v -E "Timestamps are unset|Non-monotonous DTS|pts has no value|Queue input|Guessed Channel Layout|out of order"

    EXIT_CODE=$?
    log "[Recorder][$STREAM_ID] FFmpeg encerrado (Código de saída: ${EXIT_CODE}). Reagendando reconexão em 2s..."
    sleep 2
  done
}

# -----------------------------------------------------------------------------
# Função de Limpeza Automática
# -----------------------------------------------------------------------------
limpar_disco_se_necessario() {
  MAX_STORAGE_KB=$(( MAX_STORAGE_GB * 1048576 ))
  TRIGGER_KB=$(( MAX_STORAGE_KB * TRIGGER_PERCENT / 100 ))
  TARGET_REDUCTION_KB=$(( MAX_STORAGE_KB * PURGE_PERCENT / 100 ))
  CLEANUP_TIME_SECONDS=$(( CLEANUP_TIME * 3600 ))

  TRIGGER_MB=$(( TRIGGER_KB / 1024 ))
  TARGET_REDUCTION_MB=$(( TARGET_REDUCTION_KB / 1024 ))
  MAX_STORAGE_MB=$(( MAX_STORAGE_KB / 1024 ))

  log "[Cleaner] Serviço de limpeza em segundo plano INICIADO."
  log "[Cleaner] Parâmetros de Limpeza: Teto Max: ${MAX_STORAGE_MB}MB | Gatilho: ${TRIGGER_MB}MB (${TRIGGER_PERCENT}%) | Meta Redução: ${TARGET_REDUCTION_MB}MB (${PURGE_PERCENT}%)"

  while true; do
    log "[Cleaner] --------------------------------------------------"
    log "[Cleaner] [Ciclo] Calculando espaço ocupado no disco..."

    CURRENT_USAGE_KB=$(du -k "${DEST_DIR}"/*.mp4 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    CURRENT_USAGE_MB=$(( CURRENT_USAGE_KB / 1024 ))

    log "[Cleaner] [Ciclo] Uso Atual: ${CURRENT_USAGE_MB}MB (${CURRENT_USAGE_KB} KB) / Limiar de Disparo: ${TRIGGER_MB}MB (${TRIGGER_KB} KB)"

    if [ "$CURRENT_USAGE_KB" -ge "$TRIGGER_KB" ]; then
      log "[Cleaner] [Alerta] Gatilho de limpeza ATINGIDO! (${CURRENT_USAGE_MB}MB >= ${TRIGGER_MB}MB)"
      log "[Cleaner] Executando Ação: '${CLEANUP_ACTION}' | Objetivo: Liberar ~${TARGET_REDUCTION_MB}MB..."

      FREED_KB=0

      FILE_LIST=$(ls -1tr "${DEST_DIR}"/*.mp4 2>/dev/null)
      FILE_COUNT=$(echo "$FILE_LIST" | grep -c '^')
      log "[Cleaner] Encontrados ${FILE_COUNT} arquivos de vídeo para avaliação."

      while read -r file; do
        if [ -f "$file" ]; then
          FILE_SIZE_KB=$(du -k "$file" | awk '{print $1}')
          FILE_SIZE_MB=$(( FILE_SIZE_KB / 1024 ))
          FILENAME=$(basename "$file")

          if [ "$CLEANUP_ACTION" = "MOVE" ]; then
            log "[Cleaner] [Processando] Movendo: ${FILENAME} (${FILE_SIZE_MB}MB) -> ${ARCHIVE_DIR}/"
            mv "$file" "${ARCHIVE_DIR}/${FILENAME}" 2>/dev/null
            MV_STATUS=$?
            if [ $MV_STATUS -ne 0 ]; then
              log "[Cleaner] [ERRO] Falha ao mover arquivo ${FILENAME}. Verifique permissões ou caminho do destino!"
            fi
          else
            log "[Cleaner] [Processando] Apagando: ${FILENAME} (${FILE_SIZE_MB}MB)"
            rm -f "$file"
          fi

          FREED_KB=$(( FREED_KB + FILE_SIZE_KB ))
          FREED_MB=$(( FREED_KB / 1024 ))

          log "[Cleaner] Progresso: ${FREED_MB}MB / ${TARGET_REDUCTION_MB}MB liberados."

          if [ "$FREED_KB" -ge "$TARGET_REDUCTION_KB" ]; then
            log "[Cleaner] [Sucesso] Meta de redução atingida! Total liberado neste ciclo: ${FREED_MB}MB."
            break
          fi
        fi
      done <<EOF
$FILE_LIST
EOF

    else
      log "[Cleaner] [Status] Espaço em disco sob controle. Nenhum arquivo descartado."
    fi

    log "[Cleaner] Aguardando ${CLEANUP_TIME}h (${CLEANUP_TIME_SECONDS}s) para a próxima verificação..."
    sleep "$CLEANUP_TIME_SECONDS"
  done
}

# Dispara o processo de limpeza em background
log "[System] Disparando rotina de limpeza em background..."
limpar_disco_se_necessario &

# -----------------------------------------------------------------------------
# Leitura do Config e Agendamento das Câmeras
# -----------------------------------------------------------------------------
log "[System] Lendo câmeras ativas no arquivo JSON..."
jq -c '.[] | select(.record == true)' "$CONFIG_FILE" > "$TMP_REC_FILE" 2>/dev/null

if [ -s "$TMP_REC_FILE" ]; then
  TOTAL_CAMS=$(wc -l < "$TMP_REC_FILE" | tr -d ' ')
  log "[System] Encontradas ${TOTAL_CAMS} câmera(s) configurada(s) para gravação."

  while read -r cam; do
    ID=$(echo "$cam" | jq -r '.id')
    
    if [ -n "$ID" ] && [ "$ID" != "null" ]; then
      RTSP_INTERNAL_URL="rtsp://go2rtc:8554/${ID}"
      log "[System] Inicializando worker de gravação para câmera ID: '${ID}'"
      gravar_stream "${ID}" "${RTSP_INTERNAL_URL}" &
    else
      log "[System] [Aviso] Câmera ignorada no arquivo JSON (ID inválido ou nulo)."
    fi
  done < "$TMP_REC_FILE"
else
  log "[System] [Aviso] Nenhuma câmera com flag 'record: true' foi encontrada no $CONFIG_FILE."
fi

# Limpa o arquivo temporário
rm -f "$TMP_REC_FILE"
log "[System] Arquivo temporário $TMP_REC_FILE removido."
log "[System] Módulo principal em espera passiva (tail -f)..."

exec tail -f /dev/null