#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx ca-certificates curl xz-utils
NODE_VERSION=22.23.4
if [ ! -x /usr/local/bin/node ]; then
  cd /tmp
  curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  curl -fsSLo node-SHASUMS256.txt "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
  grep " node-v${NODE_VERSION}-linux-x64.tar.xz$" node-SHASUMS256.txt | sha256sum -c -
  tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /opt
  ln -s "/opt/node-v${NODE_VERSION}-linux-x64/bin/node" /usr/local/bin/node
fi
if [ ! -e /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
id spacelake >/dev/null 2>&1 || useradd --system --home /var/lib/spacelake --shell /usr/sbin/nologin spacelake
install -d -o spacelake -g spacelake -m 750 /var/lib/spacelake
cat >/etc/systemd/system/spacelake.service <<'UNIT'
[Unit]
Description=SpaceLake website and anonymous activity
After=network-online.target
Wants=network-online.target
[Service]
User=spacelake
Group=spacelake
WorkingDirectory=/opt/spacelake/current/app
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=64
ExecStart=/usr/local/bin/node server.mjs
Restart=on-failure
RestartSec=5
StateDirectory=spacelake
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
UMask=0027
[Install]
WantedBy=multi-user.target
UNIT
cat >/etc/nginx/sites-available/spacelake <<'NGINX'
limit_req_zone $binary_remote_addr zone=spacelake_events:1m rate=2r/s;
server {
  listen 80 default_server;
  server_name spacelake.planetarypixel.be;
  client_max_body_size 4k;
  location = /api/events {
    limit_req zone=spacelake_events burst=10 nodelay;
    proxy_pass http://127.0.0.1:4192;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://127.0.0.1:4192;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/spacelake /etc/nginx/sites-enabled/spacelake
nginx -t
systemctl daemon-reload
systemctl enable spacelake nginx certbot.timer
systemctl restart spacelake
systemctl reload nginx
systemctl is-active spacelake nginx
