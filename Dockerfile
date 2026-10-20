# Stage 1: Fast Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts index.html chat.html ./
COPY src ./src
RUN npm install
RUN npm run build

# Stage 2: Streamlined Runtime Container
FROM buildpack-deps:trixie

ENV NGINX_VERSION=nginx-1.30.3
ENV NGINX_RTMP_MODULE_VERSION=cookie-nginx-rtmp

# 1. Essential system packages and slim Python runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        stunnel4 \
        gettext \
        ffmpeg \
        certbot \
        python3 \
        python3-pip \
        libpcre2-dev \
        zlib1g-dev && \
    pip3 install --no-cache-dir --break-system-packages flask gunicorn requests obsws-python && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Build and install Nginx with cookie-nginx-rtmp (permanently cached unless RTMP module changes)
COPY cookie-nginx-rtmp /tmp/build/cookie-nginx-rtmp
RUN mkdir -p /tmp/build/nginx /usr/local/nginx/html /var/lock/nginx && \
    cd /tmp/build/nginx && \
    wget -qO ${NGINX_VERSION}.tar.gz https://nginx.org/download/${NGINX_VERSION}.tar.gz && \
    tar -zxf ${NGINX_VERSION}.tar.gz && \
    cd ${NGINX_VERSION} && \
    ./configure \
        --sbin-path=/usr/local/sbin/nginx \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --pid-path=/var/run/nginx/nginx.pid \
        --lock-path=/var/lock/nginx/nginx.lock \
        --http-log-path=/var/log/nginx/access.log \
        --http-client-body-temp-path=/tmp/nginx-client-body \
        --with-http_ssl_module \
        --with-http_realip_module \
        --with-stream \
        --with-stream_ssl_module \
        --with-stream_ssl_preread_module \
        --with-threads \
        --with-cc-opt="-Wno-error" \
        --add-module=/tmp/build/cookie-nginx-rtmp && \
    sed -i 's/-Werror//g' objs/Makefile && \
    make -j $(getconf _NPROCESSORS_ONLN) CFLAGS="-Wno-error" && \
    make install && \
    cp /tmp/build/cookie-nginx-rtmp/stat.xsl /usr/local/nginx/html/stat.xsl && \
    cp conf/mime.types /etc/nginx/mime.types && \
    rm -rf /tmp/build && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# 3. Configure Stunnel
RUN mkdir -p /etc/stunnel/conf.d
COPY stunnel/stunnel.conf /etc/stunnel/stunnel.conf
COPY stunnel/stunnel4 /etc/default/stunnel4
COPY stunnel/facebook.conf /etc/stunnel/conf.d/facebook.conf
COPY stunnel/instagram.conf /etc/stunnel/conf.d/instagram.conf
COPY stunnel/tiktok.conf /etc/stunnel/conf.d/tiktok.conf
COPY stunnel/kick.conf /etc/stunnel/conf.d/kick.conf
COPY stunnel/x.conf /etc/stunnel/conf.d/x.conf

# 4. Copy static web assets from builder
COPY --from=frontend-builder /app/dist/ /usr/local/nginx/html/
COPY chat.html /usr/local/nginx/html/chat.html

# 5. App scripts and configuration (layer caching ensures updates rebuild in <1s)
COPY nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY stream_validator.py /app/stream_validator.py
COPY failover_manager.py /app/failover_manager.py
COPY update_titles.py /app/update_titles.py
COPY tiktok_pusher.py /app/tiktok_pusher.py
COPY test_noalbs.py /app/test_noalbs.py
COPY test_failover.py /app/test_failover.py
COPY noalbs /app/noalbs
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment variables
ENV YOUTUBE_URL=rtmp://x.rtmp.youtube.com/live2/
ENV FACEBOOK_URL=rtmp://127.0.0.1:19350/rtmp/
ENV INSTAGRAM_URL=rtmp://127.0.0.1:19351/rtmp/
ENV TIKTOK_URL=rtmp://127.0.0.1:19358/s_v/
ENV TWITCH_URL=rtmp://ingest.global-contribute.live-video.net/app/
ENV TROVO_URL=rtmp://livepush.trovo.live/live/
ENV KICK_URL=rtmp://127.0.0.1:19356/kick/
ENV X_URL=rtmp://127.0.0.1:19354/x/
ENV APP_NAME=live
ENV CHUNK_SIZE=8192

WORKDIR /app
EXPOSE 1935 80 8081 8443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
