#!/bin/sh
DEST_DIR="/record"
CONFIG_FILE="/cameras.json"
TMP_REC_FILE="/tmp/cameras_to_record.json"

mkdir -p "${DEST_DIR}"

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

# Rotina de Limpeza Automática em Lote (30% dos arquivos mais antigos)
limpar_disco_se_necessario() {
  MAX_USAGE=80
  PURGE_PERCENT=30

  while true; do
    # Verifica a porcentagem de uso do disco no diretório /record
    CURRENT_USAGE=$(df -k "${DEST_DIR}" | awk 'NR==2 {gsub("%","",$5); print $5}')

    if [ -n "$CURRENT_USAGE" ] && [ "$CURRENT_USAGE" -ge "$MAX_USAGE" ]; then
      echo "[Cleaner] Uso de disco em ${CURRENT_USAGE}% (Limite: ${MAX_USAGE}%). Iniciando limpeza de ~${PURGE_PERCENT}% dos vídeos antigos..."

      # Conta o total de arquivos MP4
      TOTAL_FILES=$(ls -1 "${DEST_DIR}"/*.mp4 2>/dev/null | wc -l)

      if [ "$TOTAL_FILES" -gt 0 ]; then
        # Calcula quantos arquivos representam 30% do total (mínimo de 1 arquivo)
        FILES_TO_DELETE=$(( (TOTAL_FILES * PURGE_PERCENT + 99) / 100 ))

        echo "[Cleaner] Total de gravações: ${TOTAL_FILES}. Removendo os ${FILES_TO_DELETE} arquivos mais antigos..."

        # Seleciona os N arquivos mais antigos (ordenados por data de modificação) e apaga
        ls -1t "${DEST_DIR}"/*.mp4 2>/dev/null | tail -n "${FILES_TO_DELETE}" | while read -r file; do
          if [ -f "$file" ]; then
            echo "[Cleaner] Apagando: ${file}"
            rm -f "$file"
          fi
        done

        echo "[Cleaner] Limpeza concluída!"
      else
        echo "[Cleaner] Nenhum arquivo .mp4 para remover."
      fi
    fi

    # Intervalo de 60 segundos antes da próxima checagem
    sleep 3600
  done
}

# Inicia a limpeza em segundo plano
limpar_disco_se_necessario &

# Processa câmeras configuradas e inicia as gravações
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
else
  echo "[Recorder] Nenhuma câmera configurada para gravação (record: true)."
fi

rm -f "$TMP_REC_FILE"

exec tail -f /dev/null