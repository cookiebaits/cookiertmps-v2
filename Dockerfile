# Stage 1: Fast Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts ./
RUN npm install
COPY index.html chat.html ./
COPY src ./src
RUN npm run build

# Stage 2: Streamlined Runtime Container
FROM buildpack-deps:trixie

ENV NGINX_VERSION=nginx-1.30.3
ENV NGINX_RTMP_MODULE_VERSION=cookie-nginx-rtmp

# 1. Essential system packages and slim Python runtime (optimized APT to eliminate package list hangs)
RUN echo 'Acquire::Languages "none";' > /etc/apt/apt.conf.d/99fast && \
    echo 'Dir::Cache::pkgcache "";' >> /etc/apt/apt.conf.d/99fast && \
    echo 'Dir::Cache::srcpkgcache "";' >> /etc/apt/apt.conf.d/99fast && \
    echo 'APT::Install-Recommends "0";' >> /etc/apt/apt.conf.d/99fast && \
    echo 'APT::Install-Suggests "0";' >> /etc/apt/apt.conf.d/99fast && \
    echo 'Acquire::GzipIndexes "true";' >> /etc/apt/apt.conf.d/99fast && \
    apt-get update -o Acquire::IndexTargets::deb::Translations=none && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        stunnel4 \
        gettext \
        ffmpeg \
        certbot \
        python3 \
        python3-pip \
        libpcre2-dev \
        zlib1g-dev && \
    pip3 install --no-cache-dir --break-system-packages flask gunicorn requests defusedxml && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /etc/apt/apt.conf.d/99fast

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
    NPROC=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1); [ "$NPROC" -gt 2 ] && NPROC=2; \
    make -j${NPROC} CFLAGS="-Wno-error" && \
    make install && \
    cp /tmp/build/cookie-nginx-rtmp/stat.xsl /usr/local/nginx/html/stat.xsl && \
    cp conf/mime.types /etc/nginx/mime.types && \
    rm -rf /tmp/build && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# 2b. MediaMTX (serves the looping backup video during disconnects / low bitrate)
ENV MEDIAMTX_VERSION=v1.21.3
RUN ARCH=$(dpkg --print-architecture) && \
    case "$ARCH" in amd64) MTX_ARCH=amd64 ;; arm64) MTX_ARCH=arm64 ;; armhf) MTX_ARCH=armv7 ;; *) echo "Unsupported arch $ARCH"; exit 1 ;; esac && \
    wget -qO /tmp/mediamtx.tar.gz "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_${MTX_ARCH}.tar.gz" && \
    tar -xzf /tmp/mediamtx.tar.gz -C /usr/local/bin mediamtx && \
    chmod +x /usr/local/bin/mediamtx && \
    rm /tmp/mediamtx.tar.gz

# 3. Configure Stunnel
RUN mkdir -p /etc/stunnel/conf.d /var/run/stunnel4 /var/log/stunnel4 && \
    (id -u stunnel4 >/dev/null 2>&1 || useradd -r -s /bin/false stunnel4) && \
    chown -R stunnel4:stunnel4 /var/run/stunnel4 /var/log/stunnel4 /etc/stunnel && \
    chmod 775 /var/run/stunnel4 /var/log/stunnel4
COPY stunnel/stunnel.conf /etc/stunnel/stunnel.conf
COPY stunnel/stunnel4 /etc/default/stunnel4
COPY stunnel/*.conf /etc/stunnel/conf.d/
RUN rm -f /etc/stunnel/conf.d/stunnel.conf && \
    sed -i '/reconnect/d' /etc/stunnel/conf.d/*.conf /etc/stunnel/*.conf 2>/dev/null || true && \
    chmod -R 755 /etc/stunnel && \
    touch /var/log/stunnel4/stunnel.log /tmp/stunnel.log /tmp/stunnel.pid && \
    chmod 777 /tmp/stunnel.log /tmp/stunnel.pid /var/log/stunnel4 /var/run/stunnel4 && \
    chown -R stunnel4:stunnel4 /var/run/stunnel4 /var/log/stunnel4 /etc/stunnel && \
    chmod 664 /var/log/stunnel4/stunnel.log

# 4. Copy static web assets from builder
COPY --from=frontend-builder /app/dist/ /usr/local/nginx/html/
COPY chat.html /usr/local/nginx/html/chat.html

# 5. App scripts and configuration (layer caching ensures updates rebuild in <1s)
COPY nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY stream_validator.py /app/stream_validator.py
COPY stream_protection.py /app/stream_protection.py
COPY update_titles.py /app/update_titles.py
COPY tiktok_pusher.py /app/tiktok_pusher.py
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment variables
ENV YOUTUBE_URL=rtmp://127.0.0.1:19355/live2/
ENV FACEBOOK_URL=rtmp://127.0.0.1:19350/rtmp/
ENV INSTAGRAM_URL=rtmp://127.0.0.1:19351/rtmp/
ENV TIKTOK_URL=rtmp://127.0.0.1:19358/s_v/
ENV TWITCH_URL=rtmp://127.0.0.1:19353/app/
ENV TROVO_URL=rtmp://livepush.trovo.live/live/
ENV KICK_URL=rtmp://127.0.0.1:19356/kick/
ENV X_URL=rtmp://127.0.0.1:19354/x/
ENV APP_NAME=live
ENV CHUNK_SIZE=8192

WORKDIR /app
EXPOSE 1935 8880 8080 8081 8443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
