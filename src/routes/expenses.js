import express from "express";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

const expenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  category: Joi.string().max(64).required(),
  description: Joi.string().max(255).allow("", null),
  occurredAt: Joi.date().iso().required(),
});

const summaryQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  period: Joi.string().valid("day", "week", "month").default("month"),
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, amount, currency, category, description, DATE_FORMAT(occurred_at, '%d/%m/%Y') AS occurredAt FROM expenses WHERE user_id = ? ORDER BY occurred_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { error, value } = expenseSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { amount, currency, category, description, occurredAt } = value;
  try {
    const [result] = await pool.query(
      "INSERT INTO expenses (user_id, amount, currency, category, description, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, amount, currency, category, description || null, occurredAt]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { error, value } = expenseSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { amount, currency, category, description, occurredAt } = value;
  try {
    const [result] = await pool.query(
      "UPDATE expenses SET amount=?, currency=?, category=?, description=?, occurred_at=? WHERE id=? AND user_id=?",
      [
        amount,
        currency,
        category,
        description || null,
        occurredAt,
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
      "DELETE FROM expenses WHERE id=? AND user_id=?",
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

// GET /api/expenses/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&period=month
router.get("/summary", requireAuth, async (req, res) => {
  const { error, value } = summaryQuerySchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });
  const { from, to, period } = value;

  // Build date grouping expression
  let groupExpr;
  switch (period) {
    case "day":
      // Return canonical day string in dd/mm/yyyy
      groupExpr = "DATE_FORMAT(occurred_at, '%d/%m/%Y')";
      break;
    case "week":
      // ISO week year-week
      groupExpr = "DATE_FORMAT(occurred_at, '%x-W%v')";
      break;
    case "month":
    default:
      groupExpr = "DATE_FORMAT(occurred_at, '%Y-%m')";
      break;
  }

  const filters = ["user_id = ?"];
  const params = [req.user.id];
  if (from) {
    filters.push("occurred_at >= ?");
    params.push(from);
  }
  if (to) {
    filters.push("occurred_at <= ?");
    params.push(to);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const [byCategory] = await pool.query(
      `SELECT category, SUM(amount) as total, MIN(currency) as currency
       FROM expenses
       ${where}
       GROUP BY category
       ORDER BY total DESC`,
      params
    );

    const [timeseries] = await pool.query(
      `SELECT ${groupExpr} as period, SUM(amount) as total, MIN(currency) as currency
       FROM expenses
       ${where}
       GROUP BY period
       ORDER BY period ASC`,
      params
    );

    res.json({ byCategory, timeseries, period });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
