import express from "express";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

const formSchema = Joi.object({
  loanName: Joi.string().max(120).required(),
  totalMonth: Joi.number().integer().positive().required(),
  amountPerMonth: Joi.number().min(0).required(),
  interestPercent: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required(),
  paidMonths: Joi.number().integer().min(0).optional(),
});

function mapFormToColumns(body) {
  return {
    loan_name: body.loanName,
    total_months: Number(body.totalMonth),
    amount_per_month: Number(body.amountPerMonth),
    interest_percent: Number(body.interestPercent),
    currency: String(body.currency).toUpperCase(),
    paid_months: body.paidMonths != null ? Number(body.paidMonths) : 0,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, loan_name AS loanName, total_months AS totalMonth, amount_per_month AS amountPerMonth, interest_percent AS interestPercent, currency, paid_months AS paidMonths, total_loan AS totalLoan, created_at FROM loan_repayments WHERE user_id = ? ORDER BY id DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { error, value } = formSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const data = mapFormToColumns(value);
  try {
    const [result] = await pool.query(
      "INSERT INTO loan_repayments (user_id, loan_name, total_months, amount_per_month, interest_percent, currency, paid_months) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        data.loan_name,
        data.total_months,
        data.amount_per_month,
        data.interest_percent,
        data.currency,
        data.paid_months,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { error, value } = formSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const data = mapFormToColumns(value);
  try {
    const [result] = await pool.query(
      "UPDATE loan_repayments SET loan_name=?, total_months=?, amount_per_month=?, interest_percent=?, currency=?, paid_months=? WHERE id=? AND user_id=?",
      [
        data.loan_name,
        data.total_months,
        data.amount_per_month,
        data.interest_percent,
        data.currency,
        data.paid_months,
        req.params.id,
        req.user.id,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });
    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM loan_repayments WHERE id=? AND user_id=?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

// GET /api/loan-repayments/:id/schedule
router.get("/:id/schedule", requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, loan_name AS loanName, total_months AS totalMonths, amount_per_month AS monthlyPayment, interest_percent AS interestPercent, currency, paid_months AS paidMonths
       FROM loan_repayments WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    const loan = rows[0];
    const totalMonths = Number(loan.totalMonths);
    const paidMonths = Number(loan.paidMonths || 0);
    const monthlyPayment = Number(loan.monthlyPayment);
    const r = Number(loan.interestPercent) / 12 / 100;

    // For a simple schedule: assume remaining balance equals remaining months * monthlyPayment (naive),
    // but with interest we split payment into interest/principal parts on the fly.
    // If r == 0, it's straightforward linear payoff.
    let balance;
    if (r === 0) {
      balance = monthlyPayment * (totalMonths - paidMonths);
    } else {
      // If payment is fixed, approximate remaining balance for an installment loan
      // Remaining balance after n payments: P * (1+r)^n - A * [((1+r)^n - 1) / r]
      // We don't have original principal P; however, totalMonths and monthlyPayment are stored, not P.
      // Derive P from A, r, N: P = A * (1 - (1+r)^-N) / r
      const N = totalMonths;
      const A = monthlyPayment;
      const P = r === 0 ? A * N : A * (1 - Math.pow(1 + r, -N)) / r;
      const n = paidMonths;
      balance = P * Math.pow(1 + r, n) - A * ((Math.pow(1 + r, n) - 1) / r);
    }

    const series = [];
    let currentBalance = balance;
    const remainingMonths = Math.max(0, totalMonths - paidMonths);
    for (let i = 0; i < remainingMonths; i++) {
      if (r === 0) {
        const interest = 0;
        const principal = Math.min(monthlyPayment, currentBalance);
        currentBalance = Math.max(0, currentBalance - principal);
        series.push({ monthIndex: paidMonths + i + 1, interest, principal, balance: Number(currentBalance.toFixed(2)) });
      } else {
        const interest = currentBalance * r;
        let principal = monthlyPayment - interest;
        if (principal < 0) principal = 0; // avoid negative when payment too small
        if (principal > currentBalance) principal = currentBalance;
        currentBalance = Math.max(0, currentBalance - principal);
        series.push({ monthIndex: paidMonths + i + 1, interest: Number(interest.toFixed(2)), principal: Number(principal.toFixed(2)), balance: Number(currentBalance.toFixed(2)) });
      }
    }

    res.json({
      summary: {
        totalMonths,
        paidMonths,
        monthlyPayment,
        interestPercent: Number(loan.interestPercent),
        remainingBalance: Number(balance.toFixed(2)),
        currency: loan.currency,
      },
      series,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
