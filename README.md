# FalconSec Intelligence – Certificate Generation Platform

A full-featured, production-ready certificate generation platform for FalconSec Intelligence.

## Features

- **Single & Batch Certificate Generation** — Generate PDF certificates individually or from CSV/Excel
- **Professional PDF Design** — FalconSec-branded A4 landscape certificates with QR codes
- **Certificate Verification** — Public endpoint to verify certificate authenticity
- **JWT Authentication** — Role-based access (admin / manager / user)
- **Email Delivery** — Send certificates via SMTP with PDF attachments
- **Admin Dashboard** — Full-featured UI with charts, tables, and management
- **Template Management** — Customizable certificate templates
- **API Documentation** — Interactive Swagger UI at `/api-docs`
- **Audit Logging** — Activity and email logs

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3
- **Auth**: JWT + bcryptjs
- **PDF**: PDFKit
- **QR Codes**: qrcode
- **Email**: Nodemailer
- **Testing**: Jest + Supertest

## Quick Start

```bash
npm install
cp .env.example .env
npm run migrate
npm start
```

Visit `http://localhost:3000`. Default credentials: **admin / admin123**

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | — | Change in production! |
| `DB_PATH` | `./data/certificates.db` | SQLite path |
| `EMAIL_HOST` | `smtp.gmail.com` | SMTP host |
| `APP_URL` | `http://localhost:3000` | Public URL for QR codes |

## API Docs

Interactive docs available at `http://localhost:3000/api-docs`

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/certificates` | Generate certificate |
| `POST` | `/api/certificates/batch` | Batch generate (CSV/Excel) |
| `GET` | `/api/certificates/verify/:certId` | Public verify |
| `GET` | `/api/certificates/:id/download` | Download PDF |
| `GET` | `/api/stats/dashboard` | Dashboard stats |

### Batch CSV Format

```csv
name,email,course
John Doe,john@example.com,Ethical Hacking
Jane Smith,jane@example.com,Network Security
```

## Docker

```bash
docker-compose up -d
```

## Testing

```bash
npm test
```
