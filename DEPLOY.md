# Deployment — VPS (Ubuntu) at app.nbsvworldwide.com

One subdomain serves everything:
`https://app.nbsvworldwide.com` → nginx serves the frontend and proxies
`/api` + `/storage` to the Node backend (`agro-api`) on `127.0.0.1:3002`.

> DNS already set: `app.nbsvworldwide.com  A  103.150.101.67`.

Assumes Ubuntu 22.04+. Adjust package commands for other distros.

---

## 1. Install prerequisites (on the VPS)
```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2. Get the code
```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/jordannanyan/agro-api.git
git clone https://github.com/jordannanyan/agro-web.git
```

## 3. Database
```bash
sudo mysql <<'SQL'
CREATE USER IF NOT EXISTS 'agro'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG';
GRANT ALL PRIVILEGES ON *.* TO 'agro'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
```
(Broad grant so the reset script can create the DB. Narrow later if you like.)

## 4. Backend (agro-api)
```bash
cd /var/www/agro-api
cp .env.example .env
nano .env       # set the values below
```
`.env`:
```
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=agro
DB_PASSWORD=CHANGE_ME_STRONG
DB_NAME=agro_supply
JWT_SECRET=<paste a long random string>     # e.g. `openssl rand -hex 32`
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./storage/proofs
PUBLIC_UPLOAD_BASE=/storage/proofs
```
Build, seed the DB, and start under pm2:
```bash
npm ci
npm run build
npm run db:reset            # creates schema + seed (real bcrypt hash) + views
pm2 start dist/server.js --name agro-api
pm2 save
pm2 startup                 # run the printed command once to enable boot start
```
Default login seeded: **finance01 / password** (change it after first login).

## 5. Frontend (agro-web)
```bash
cd /var/www/agro-web
cp .env.example .env.production
nano .env.production
```
`.env.production`:
```
VITE_API_URL=https://app.nbsvworldwide.com/api
VITE_FILE_BASE=https://app.nbsvworldwide.com
```
Build (outputs to `dist/`, which nginx serves):
```bash
npm ci
npm run build
```

## 6. nginx
```bash
sudo cp /var/www/agro-web/deploy/nginx-app.conf /etc/nginx/sites-available/agro-app
sudo ln -s /etc/nginx/sites-available/agro-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # optional: drop the default site
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Firewall + HTTPS
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.nbsvworldwide.com   # auto-configures HTTPS + redirect
```
Now visit **https://app.nbsvworldwide.com**.

---

## Updating later
```bash
# backend
cd /var/www/agro-api && git pull && npm ci && npm run build && pm2 restart agro-api
# frontend
cd /var/www/agro-web && git pull && npm ci && npm run build   # nginx picks up new dist automatically
```

## Notes / security
- Do **not** expose ports 3002 (Node) or 3306 (MySQL) publicly — ufw only opens 22/80/443. The API and DB are reached only via localhost / nginx proxy.
- Change the seeded `finance01` password and use a strong `DB_PASSWORD` + `JWT_SECRET`.
- Uploads live in `agro-api/storage/` (git-ignored). Back this folder up along with a `mysqldump` of `agro_supply`.
- `npm run db:reset` **drops and recreates** the database — only run it on first setup or when you intend to wipe data. For migrations later, apply SQL manually instead.
