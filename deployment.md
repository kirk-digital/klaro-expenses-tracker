# Klaro — VPS production deploy

**URL:** `https://expenses-tracker.kirkdaledigital.co.uk`  
**Repo:** `git@github.com:kirk-digital/klaro-expenses-tracker.git`  
**VPS user:** `sysadmin` (assumes **GitHub SSH is already working** for this user — no new keys in this guide)  
**App directory:** `/var/www/expenses-tracker` (alongside your other sites under `/var/www`)  
**PM2 name:** `klaro-expenses` (port **3000**)

Do the steps **in order**.

---

### 0. DNS

Add an **A** record: `expenses-tracker.kirkdaledigital.co.uk` → your VPS IP. Wait until it resolves before Certbot (step 8).

---

### 1. Packages (run on the VPS)

```bash
sudo apt update
sudo apt install -y nginx postgresql python3-certbot-nginx git
```

**Node.js 20** (example using NodeSource; use another method if you prefer):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
sudo npm install -g pm2
```

---

### 2. App code under `/var/www/expenses-tracker`

```bash
sudo mkdir -p /var/www/expenses-tracker
sudo chown -R sysadmin:sysadmin /var/www/expenses-tracker
cd /var/www/expenses-tracker
git clone git@github.com:kirk-digital/klaro-expenses-tracker.git .
```

If the remote ever used HTTPS, fix it:

```bash
git remote set-url origin git@github.com:kirk-digital/klaro-expenses-tracker.git
```

---

### 3. PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE klaro_app WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE klaro_expenses OWNER klaro_app;
GRANT ALL PRIVILEGES ON DATABASE klaro_expenses TO klaro_app;
\q
```

Use in `.env` (step 5):

`postgresql://klaro_app:REPLACE_WITH_STRONG_PASSWORD@127.0.0.1:5432/klaro_expenses?schema=public`

---

### 4. Receipt storage

```bash
sudo mkdir -p /var/data/expenses-tracker/receipts
sudo chown -R sysadmin:sysadmin /var/data/expenses-tracker
```

---

### 5. Environment file

```bash
cd /var/www/expenses-tracker
cp .env.example .env
nano .env
chmod 600 .env
```

Set:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | From step 3 |
| `NEXTAUTH_URL` | `https://expenses-tracker.kirkdaledigital.co.uk` (no trailing slash) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_SECRET` | Same as `NEXTAUTH_SECRET` |
| `RECEIPT_STORAGE_PATH` | `/var/data/expenses-tracker/receipts` |

When you add outbound email in the app: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Klaro <noreply@kirkdaledigital.co.uk>`).

---

### 6. Install, migrate, build

```bash
cd /var/www/expenses-tracker
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Do **not** run `npm run db:seed` on production unless you deliberately want demo accounts.

---

### 7. PM2

```bash
cd /var/www/expenses-tracker
pm2 start npm --name klaro-expenses -- start
pm2 save
pm2 startup
```

Run the `sudo …` line PM2 prints, then `pm2 save` again.

---

### 8. nginx, TLS, firewall

**Site config:** only paste the lines inside the `server { … }` block into the file — **no** markdown backticks (no ` ``` ` lines).

`proxy_pass` points at **Next.js on this server** (default port 3000 from `npm run start` / PM2). It is not your public URL.

```bash
sudo nano /etc/nginx/sites-available/klaro-expenses.conf
```

```
server {
    listen 80;
    listen [::]:80;
    server_name expenses-tracker.kirkdaledigital.co.uk;
    client_max_body_size 12M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/klaro-expenses.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**HTTPS:**

```bash
sudo certbot --nginx -d expenses-tracker.kirkdaledigital.co.uk
```

Confirm `NEXTAUTH_URL` in `.env` is still the `https://…` URL, then:

```bash
pm2 restart klaro-expenses
```

**UFW (if you use it):**

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### 9. Verify

Open `https://expenses-tracker.kirkdaledigital.co.uk` → **Sign up** → onboarding → dashboard (no seed required).

If auth misbehaves: check `NEXTAUTH_URL` / secrets and `pm2 logs klaro-expenses`.

---

### 10. Deploy updates later

```bash
cd /var/www/expenses-tracker
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
pm2 restart klaro-expenses
```

(Use your real branch name if not `main`.)
