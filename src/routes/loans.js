import express from "express";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

// Original API schema
const loanSchema = Joi.object({
  principal: Joi.number().positive().required(),
  interestRateAnnual: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required(),
  startDate: Joi.date().iso().required(),
  termMonths: Joi.number().integer().positive().required(),
  description: Joi.string().max(255).allow("", null),
});

// LoanRepayments form schema (from loan project)
// Accepts: loanName, totalMonth, amountPerMonth, interestPercent, currency
const formSchema = Joi.object({
  loanName: Joi.string().max(120).required(),
  totalMonth: Joi.number().integer().positive().required(),
  amountPerMonth: Joi.number().min(0).required(),
  interestPercent: Joi.number().min(0).required(),
  currency: Joi.string().length(3).required(),
});

function transformFormToLoanShape(body) {
  const principal = Number(body.totalMonth) * Number(body.amountPerMonth);
  const interestRateAnnual = Number(body.interestPercent); // store as provided
  const currency = String(body.currency).toUpperCase();
  const startDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const termMonths = Number(body.totalMonth);
  const description = body.loanName || null;
  return {
    principal,
    interestRateAnnual,
    currency,
    startDate,
    termMonths,
    description,
  };
}

function validateAndNormalize(body) {
  // Try original shape first
  let { error, value } = loanSchema.validate(body);
  if (!error) return { shape: "loan", value };
  // Try form shape and transform
  const form = formSchema.validate(body);
  if (!form.error) {
    const normalized = transformFormToLoanShape(form.value);
    // Ensure normalized fits original schema
    const normalizedCheck = loanSchema.validate(normalized);
    if (!normalizedCheck.error) return { shape: "form", value: normalized };
  }
  return { error: error || form.error };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, principal, interest_rate_annual, currency, start_date, term_months, description FROM loans WHERE user_id = ? ORDER BY id DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const norm = validateAndNormalize(req.body);
  if (norm.error) return res.status(400).json({ message: norm.error.message });
  const { principal, interestRateAnnual, currency, startDate, termMonths, description } = norm.value;
  try {
    const [dbResult] = await pool.query(
      "INSERT INTO loans (user_id, principal, interest_rate_annual, currency, start_date, term_months, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        principal,
        interestRateAnnual,
        currency,
        startDate,
        termMonths,
        description || null,
      ]
    );
    res.status(201).json({ id: dbResult.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const norm = validateAndNormalize(req.body);
  if (norm.error) return res.status(400).json({ message: norm.error.message });
  const { principal, interestRateAnnual, currency, startDate, termMonths, description } = norm.value;
  try {
    const [dbResult] = await pool.query(
      "UPDATE loans SET principal=?, interest_rate_annual=?, currency=?, start_date=?, term_months=?, description=? WHERE id=? AND user_id=?",
      [
        principal,
        interestRateAnnual,
        currency,
        startDate,
        termMonths,
        description || null,
        req.params.id,
        req.user.id,
      ]
    );
    if (dbResult.affectedRows === 0)
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
      "DELETE FROM loans WHERE id=? AND user_id=?",
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
