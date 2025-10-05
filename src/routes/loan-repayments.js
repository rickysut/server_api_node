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

