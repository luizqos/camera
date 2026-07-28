FROM jrottenberg/ffmpeg:4.4-alpine

# Instala o jq e o dos2unix para corrigir quebras de linha do Windows
RUN apk add --no-cache jq dos2unix

COPY entrypoint-recorder.sh /entrypoint-recorder.sh

# Remove caracteres \r (CRLF -> LF) e dá permissão de execução
RUN dos2unix /entrypoint-recorder.sh && chmod +x /entrypoint-recorder.sh

ENTRYPOINT ["/bin/sh", "/entrypoint-recorder.sh"]