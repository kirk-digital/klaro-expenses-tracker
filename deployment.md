# Klaro — production deployment guide

This document walks you from **code on GitHub** to **Klaro** running on **`https://expenses-tracker.kirkdaledigital.co.uk`** behind **nginx** and **PM2**, with **PostgreSQL** on the same VPS.

**Repository (SSH):** `git@github.com:kirk-digital/klaro-expenses-tracker.git`  
**VPS user:** `sysadmin`  
**App name (product):** Klaro  

The application codebase does **not** call Resend yet (invites are link-only in the UI). A **Resend** section below lists environment variables and DNS so you can plug email in when you add it.

---

## 1. Prerequisites

On the VPS you should have (or install):

| Component | Notes |
|-----------|--------|
| **Ubuntu/Debian** (typical) | Commands below assume `apt`; adapt for RHEL if needed. |
| **Node.js 20 LTS** | Next.js 14 runs well on Node 18+; 20 LTS is a safe default. |
| **npm** | Comes with Node or install separately. |
| **PostgreSQL 14+** | Local instance on the VPS is fine. |
| **nginx** | Reverse proxy + TLS termination. |
| **certbot** | Let’s Encrypt certificates (`python3-certbot-nginx` on Debian/Ubuntu). |
| **PM2** | `npm install -g pm2` as a user that will run the app (e.g. `sysadmin`). |

**DNS:** Create an **A** (or **AAAA**) record:

- **Host:** `expenses-tracker` (or full name depending on your DNS UI)  
- **Target:** your VPS public IP  

Wait until the record resolves before running Certbot.

---

## 2. GitHub access without a password (`sysadmin`)

GitHub does not use your Linux login password. Use an **SSH key** so `git pull` / `git push` never prompt for a GitHub password.

### 2.1 Generate a key on the VPS

SSH in as `sysadmin`, then:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "sysadmin@klaro-vps" -f ~/.ssh/github_klaro_expenses -N ""
```

`-N ""` sets an **empty key passphrase** so Git commands stay non-interactive. If you prefer a passphrase, omit `-N ""` and use `ssh-agent` (not covered here).

### 2.2 Install the public key on GitHub

Show the public key:

```bash
cat ~/.ssh/github_klaro_expenses.pub
```

**Option A — Deploy key (one repo, typical for a server)**  

1. Open: [https://github.com/kirk-digital/klaro-expenses-tracker](https://github.com/kirk-digital/klaro-expenses-tracker)  
2. **Settings → Deploy keys → Add deploy key**  
3. Paste the public key, give it a title (e.g. `VPS sysadmin`).  
4. Enable **Allow write access** if this server must `git push`; otherwise read-only is enough for deploy-only pulls.

**Option B — SSH key on your GitHub account**  

**Settings → SSH and GPG keys → New SSH key** — use the same public key if this identity should access multiple repos.

### 2.3 SSH config for GitHub

```bash
nano ~/.ssh/config
```

Add:

```text
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_klaro_expenses
  IdentitiesOnly yes
```

```bash
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
```

Test:

```bash
ssh -T git@github.com
```

### 2.4 Clone the repository

Pick an app directory (example: under the home user):

```bash
cd ~
git clone git@github.com:kirk-digital/klaro-expenses-tracker.git klaro-expenses-tracker
cd klaro-expenses-tracker
```

If you ever used HTTPS by mistake, fix the remote:

```bash
git remote set-url origin git@github.com:kirk-digital/klaro-expenses-tracker.git
```

---

## 3. PostgreSQL

Run as a user that can administer Postgres (often `postgres` via `sudo`).

### 3.1 Create role and database

Adjust names/passwords to your policy:

```bash
sudo -u postgres psql
```

In the `psql` prompt:

```sql
CREATE ROLE klaro_app WITH LOGIN PASSWORD 'choose_a_strong_password';
CREATE DATABASE klaro_expenses OWNER klaro_app;
GRANT ALL PRIVILEGES ON DATABASE klaro_expenses TO klaro_app;
\q
```

**Connection string** (for `.env`):

```text
DATABASE_URL="postgresql://klaro_app:choose_a_strong_password@127.0.0.1:5432/klaro_expenses?schema=public"
```

Use `127.0.0.1` if Postgres only listens locally (recommended).

### 3.2 Extensions (if you add any later)

Prisma migrations for this project do not require extra extensions by default. If you add `pgcrypto` etc., grant usage as needed.

---

## 4. System paths and permissions

Receipt storage must exist and be writable by the user running Node (`sysadmin` in this guide):

```bash
sudo mkdir -p /var/data/expenses-tracker/receipts
sudo chown -R sysadmin:sysadmin /var/data/expenses-tracker
```

---

## 5. Application environment (`.env`)

On the VPS, in the app directory:

```bash
cd ~/klaro-expenses-tracker
cp .env.example .env
nano .env
```

Set at least:

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | As in §3.1 |
| `NEXTAUTH_URL` | `https://expenses-tracker.kirkdaledigital.co.uk` |
| `NEXTAUTH_SECRET` | Long random string (e.g. `openssl rand -base64 32`) |
| `AUTH_SECRET` | Can match `NEXTAUTH_SECRET` for Auth.js v5 |
| `RECEIPT_STORAGE_PATH` | `/var/data/expenses-tracker/receipts` |

**Resend (for when the app sends mail)** — not used by the current codebase, but typical names to reserve:

| Variable | Notes |
|----------|--------|
| `RESEND_API_KEY` | From [Resend dashboard](https://resend.com/api-keys) |
| `EMAIL_FROM` | e.g. `Klaro <noreply@kirkdaledigital.co.uk>` |

Add these to `.env` when you implement sending; ensure Resend domain **kirkdaledigital.co.uk** (or sending domain) is verified in Resend and DNS (SPF/DKIM) matches their docs.

**Security:** restrict `.env` permissions:

```bash
chmod 600 .env
```

---

## 6. Build and database migrations

```bash
cd ~/klaro-expenses-tracker
npm ci
npx prisma generate
npx prisma migrate deploy
```

**Seeding:** `npm run db:seed` is for **development/demo data** (test users and passwords). **Do not run seed on production** unless you intentionally want those accounts.

```bash
npm run build
```

Confirm it completes with no errors.

---

## 7. PM2

Install PM2 globally (once):

```bash
sudo npm install -g pm2
```

Start the app (from the app directory):

```bash
cd ~/klaro-expenses-tracker
pm2 start npm --name klaro-expenses -- start
pm2 save
```

Enable PM2 on boot (run the command PM2 prints; it often looks like):

```bash
pm2 startup
```

Follow the one-liner it outputs (may require `sudo`), then:

```bash
pm2 save
```

**Useful commands:**

```bash
pm2 status
pm2 logs klaro-expenses
pm2 restart klaro-expenses
```

Default **port** for `next start` is **3000**. nginx will proxy to that.

---

## 8. nginx

### 8.1 Install

```bash
sudo apt update
sudo apt install -y nginx
```

### 8.2 Site configuration

Create a site file (name can vary):

```bash
sudo nano /etc/nginx/sites-available/klaro-expenses.conf
```

Example contents:

```nginx
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

Enable the site and test nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/klaro-expenses.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8.3 TLS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d expenses-tracker.kirkdaledigital.co.uk
```

Certbot will adjust the server block for HTTPS. Renewals are usually installed as a timer automatically.

After HTTPS works, ensure **`NEXTAUTH_URL`** in `.env` is exactly `https://expenses-tracker.kirkdaledigital.co.uk`, then:

```bash
pm2 restart klaro-expenses
```

### 8.4 Firewall (if UFW is used)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 9. Smoke test (login)

1. Open `https://expenses-tracker.kirkdaledigital.co.uk`  
2. You should get the sign-in page over HTTPS.  
3. If you **did not** seed production: create an account via **Sign up**, complete **onboarding** (first organisation), then sign in.  
4. If you **did** seed (not recommended for real prod): use the seeded emails from the project README **only** if you ran `db:seed`.

If login fails or redirects loop, check:

- `NEXTAUTH_URL` matches the public URL (scheme + host, no trailing slash).  
- `AUTH_SECRET` / `NEXTAUTH_SECRET` set and PM2 restarted after changes.  
- Browser devtools → Network for failed requests and PM2 logs: `pm2 logs klaro-expenses`.

---

## 10. Deploy updates (routine)

On the VPS as `sysadmin`:

```bash
cd ~/klaro-expenses-tracker
git pull origin main
```

(Use your real default branch name if it is not `main`.)

```bash
npm ci
npx prisma migrate deploy
npm run build
pm2 restart klaro-expenses
```

---

## 11. Checklist summary

- [ ] DNS **A** record for `expenses-tracker.kirkdaledigital.co.uk` → VPS IP  
- [ ] SSH key for `sysadmin` → GitHub (deploy key or account key)  
- [ ] Repo cloned with **SSH** remote  
- [ ] PostgreSQL role + database + `DATABASE_URL`  
- [ ] `/var/data/expenses-tracker/receipts` exists and owned by app user  
- [ ] `.env` with production URLs and secrets  
- [ ] `npx prisma migrate deploy` + `npm run build`  
- [ ] PM2 process + `pm2 save` + `pm2 startup`  
- [ ] nginx site + `client_max_body_size 12M`  
- [ ] Certbot TLS  
- [ ] Browser test sign-in / sign-up  

---

## 12. Optional: PM2 ecosystem file

Instead of `pm2 start npm -- start`, you can add `ecosystem.config.cjs` in the repo later with `cwd`, `env_file`, and `instances: 1` for clarity. Not required for a first deploy.

---

## Support references

- [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying)  
- [Prisma migrate deploy](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)  
- [PM2 documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)  
- [Resend — Next.js](https://resend.com/docs/send-with-nextjs) (when you add outbound email)
