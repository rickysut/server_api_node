### API Utama

- `POST /api/auth/register` {name,email,password} → token
- `POST /api/auth/login` {email,password} → token
- `GET /api/expenses` (Bearer) → daftar
- `POST /api/expenses` (Bearer)
- `GET /api/loans`, `POST /api/loans` (Bearer)
- `GET /api/goals`, `POST /api/goals` (Bearer)
- `GET /api/currency/convert?from=USD&to=IDR&amount=1` (Bearer)
- `POST /api/currency/base` {baseCurrency} (Bearer)

### Produksi

- Set `JWT_SECRET` kuat, aktifkan HTTPS di reverse proxy
- Tambahkan rate limiting, monitoring, dan backup DB

### Lisensi

MIT
