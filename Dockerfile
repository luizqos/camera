FROM jrottenberg/ffmpeg:4.4-alpine

# Instala o jq e o dos2unix
RUN apk add --no-cache jq dos2unix

# Copia o script para dentro da imagem
COPY entrypoint-recorder.sh /entrypoint-recorder.sh

# Converte obrigatoriamente para LF (Unix) e dá permissão de execução
RUN dos2unix /entrypoint-recorder.sh && chmod +x /entrypoint-recorder.sh

ENTRYPOINT ["/bin/sh", "/entrypoint-recorder.sh"]