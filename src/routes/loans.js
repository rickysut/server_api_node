import express from "express";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

const loanSchema = Joi.object({
  principal: Joi.number().positive().required(),
  interestRateAnnual: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required(),
  startDate: Joi.date().iso().required(),
  termMonths: Joi.number().integer().positive().required(),
  description: Joi.string().max(255).allow("", null),
});

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
  const { error, value } = loanSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const {
    principal,
    interestRateAnnual,
    currency,
    startDate,
    termMonths,
    description,
  } = value;
  try {
    const [result] = await pool.query(
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
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { error, value } = loanSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const {
    principal,
    interestRateAnnual,
    currency,
    startDate,
    termMonths,
    description,
  } = value;
  try {
    const [result] = await pool.query(
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
