### API Utama

- `POST /api/auth/register` {name,email,password} → token
- `POST /api/auth/login` {email,password} → token
- `GET /api/expenses` (Bearer) → daftar
- `POST /api/expenses` (Bearer)
- `GET /api/expenses/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&period=day|week|month` (Bearer)
  - Returns `{ byCategory: [{ category, total, currency }], timeseries: [{ period, total, currency }], period }`
- `GET /api/loans`, `POST /api/loans` (Bearer)
  - Accepts two payload shapes:
    - Original: `{principal, interestRateAnnual, currency, startDate, termMonths, description}`
    - Loan form: `{loanName, totalMonth, amountPerMonth, interestPercent, currency}`
      - Server transforms to original shape: `principal = totalMonth * amountPerMonth`, `interestRateAnnual = interestPercent`, `startDate = today`, `termMonths = totalMonth`, `description = loanName`

- `GET /api/loan-repayments`, `POST /api/loan-repayments` (Bearer)
  - Payload: `{loanName, totalMonth, amountPerMonth, interestPercent, currency, paidMonths?}`
  - Returns rows with `totalLoan` computed by DB.
- `GET /api/loan-repayments/:id/schedule` (Bearer)
  - Returns `{ summary: { totalMonths, paidMonths, monthlyPayment, interestPercent, remainingBalance, currency }, series: [{ monthIndex, interest, principal, balance }] }`
- `GET /api/goals`, `POST /api/goals` (Bearer)
- `GET /api/goals/:id/projection?monthlySaving=NUMBER` (Bearer)
  - Returns `{ projection: { monthsNeeded, projectedDate, meetsTarget, deltaDays }, progress: { currentAmount, targetAmount, percent, currency } }`
- `GET /api/currency/convert?from=USD&to=IDR&amount=1` (Bearer)
- `POST /api/currency/base` {baseCurrency} (Bearer)

### Produksi

- Set `JWT_SECRET` kuat, aktifkan HTTPS di reverse proxy
- Tambahkan rate limiting, monitoring, dan backup DB

### Lisensi

MIT
