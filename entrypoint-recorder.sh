#!/bin/sh
DEST_DIR="/record"
ARCHIVE_DIR="/archive"
CONFIG_FILE="/cameras.json"
TMP_REC_FILE="/tmp/cameras_to_record.json"

# Lê as variáveis enviadas pelo Docker Compose / .env (com fallback)
MAX_STORAGE_GB="${MAX_STORAGE_GB:-100}"
TRIGGER_PERCENT="${TRIGGER_PERCENT:-80}"
PURGE_PERCENT="${PURGE_PERCENT:-30}"
CLEANUP_ACTION="${CLEANUP_ACTION:-MOVE}"
CLEANUP_TIME="${CLEANUP_TIME:-60}"


mkdir -p "${DEST_DIR}"

if [ "$CLEANUP_ACTION" = "MOVE" ]; then
  mkdir -p "${ARCHIVE_DIR}"
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[Recorder] Erro: Arquivo $CONFIG_FILE nao encontrado!"
  exit 1
fi

gravar_stream() {
  STREAM_ID=$1
  RTSP_URL=$2

  while true; do
    TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
    OUTPUT_FILE="${DEST_DIR}/${STREAM_ID}_${TIMESTAMP}.mp4"
  
    echo "[Cleaner] TIME: ${CLEANUP_TIME} Hour"

    echo "[Recorder] Iniciando gravação de ${STREAM_ID} -> ${OUTPUT_FILE}"

    ffmpeg -hide_banner -loglevel warning \
      -fflags +genpts \
      -use_wallclock_as_timestamps 1 \
      -rtsp_transport tcp \
      -i "${RTSP_URL}" \
      -c:v copy \
      -c:a aac \
      -fs 104857600 \
      "${OUTPUT_FILE}"

    echo "[Recorder] Conexão perdida com ${STREAM_ID}. Reagendando em 2s..."
    sleep 2
  done
}

limpar_disco_se_necessario() {
  MAX_STORAGE_KB=$(( MAX_STORAGE_GB * 1048576 ))
  TRIGGER_KB=$(( MAX_STORAGE_KB * TRIGGER_PERCENT / 100 ))
  TARGET_REDUCTION_KB=$(( MAX_STORAGE_KB * PURGE_PERCENT / 100 ))
  CLEANUP_TIME_HOUR=$(( CLEANUP_TIME * 3600 ))

  while true; do
    CURRENT_USAGE_KB=$(du -k "${DEST_DIR}"/*.mp4 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    CURRENT_USAGE_MB=$(( CURRENT_USAGE_KB / 1024 ))

    if [ "$CURRENT_USAGE_KB" -ge "$TRIGGER_KB" ]; then
      echo "[Cleaner] Uso de gravações: ${CURRENT_USAGE_MB}MB (Gatilho: ${TRIGGER_PERCENT}% de ${MAX_STORAGE_GB}GB)."
      echo "[Cleaner] Ação: ${CLEANUP_ACTION}. Processando ~${PURGE_PERCENT}% (${TARGET_REDUCTION_KB}KB)..."

      FREED_KB=0

      ls -1tr "${DEST_DIR}"/*.mp4 2>/dev/null | while read -r file; do
        if [ -f "$file" ]; then
          FILE_SIZE_KB=$(du -k "$file" | awk '{print $1}')
          
          if [ "$CLEANUP_ACTION" = "MOVE" ]; then
            FILENAME=$(basename "$file")
            echo "[Cleaner] Movendo: ${FILENAME} -> ${ARCHIVE_DIR}/"
            mv "$file" "${ARCHIVE_DIR}/${FILENAME}"
          else
            echo "[Cleaner] Apagando: ${file}"
            rm -f "$file"
          fi

          FREED_KB=$(( FREED_KB + FILE_SIZE_KB ))

          if [ "$FREED_KB" -ge "$TARGET_REDUCTION_KB" ]; then
            echo "[Cleaner] Processamento concluído! Total: $(( FREED_KB / 1024 ))MB."
            break
          fi
        fi
      done
    fi

    sleep $CLEANUP_TIME_HOUR
  done
}

limpar_disco_se_necessario &

jq -c '.[] | select(.record == true)' "$CONFIG_FILE" > "$TMP_REC_FILE" 2>/dev/null

if [ -s "$TMP_REC_FILE" ]; then
  while read -r cam; do
    ID=$(echo "$cam" | jq -r '.id')
    
    if [ -n "$ID" ] && [ "$ID" != "null" ]; then
      RTSP_INTERNAL_URL="rtsp://go2rtc:8554/${ID}"
      echo "[Recorder] Agendando gravação para: ${ID}"
      gravar_stream "${ID}" "${RTSP_INTERNAL_URL}" &
    fi
  done < "$TMP_REC_FILE"
fi

rm -f "$TMP_REC_FILE"

exec tail -f /dev/null