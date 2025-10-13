import express from "express";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

const goalSchema = Joi.object({
  name: Joi.string().max(120).required(),
  targetAmount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  targetDate: Joi.date().iso().required(),
  currentAmount: Joi.number().min(0).default(0),
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, target_amount, currency, target_date, current_amount FROM goals WHERE user_id=? ORDER BY target_date",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { error, value } = goalSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { name, targetAmount, currency, targetDate, currentAmount } = value;
  try {
    const [result] = await pool.query(
      "INSERT INTO goals (user_id, name, target_amount, currency, target_date, current_amount) VALUES (?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        name,
        targetAmount,
        currency,
        targetDate,
        currentAmount || 0,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { error, value } = goalSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { name, targetAmount, currency, targetDate, currentAmount } = value;
  try {
    const [result] = await pool.query(
      "UPDATE goals SET name=?, target_amount=?, currency=?, target_date=?, current_amount=? WHERE id=? AND user_id=?",
      [
        name,
        targetAmount,
        currency,
        targetDate,
        currentAmount || 0,
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
      "DELETE FROM goals WHERE id=? AND user_id=?",
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

const projectionQuerySchema = Joi.object({
  monthlySaving: Joi.number().positive().required(),
});

// GET /api/goals/:id/projection?monthlySaving=NUMBER
router.get("/:id/projection", requireAuth, async (req, res) => {
  const { error, value } = projectionQuerySchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });
  const { monthlySaving } = value;
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, target_amount AS targetAmount, currency, target_date AS targetDate, current_amount AS currentAmount
       FROM goals WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    const g = rows[0];
    const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount));
    const monthsNeeded = remaining <= 0 ? 0 : Math.ceil(remaining / Number(monthlySaving));
    const today = new Date();
    const projectedDate = new Date(today.getFullYear(), today.getMonth() + monthsNeeded, today.getDate());
    const targetDate = new Date(g.targetDate);
    const meetsTarget = projectedDate <= targetDate;
    const deltaDays = Math.ceil((projectedDate - targetDate) / (1000 * 60 * 60 * 24));
    const percent = Number(g.targetAmount) === 0 ? 100 : Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100));
    res.json({
      projection: {
        monthsNeeded,
        projectedDate: projectedDate.toISOString().slice(0, 10),
        meetsTarget,
        deltaDays,
      },
      progress: {
        currentAmount: Number(g.currentAmount),
        targetAmount: Number(g.targetAmount),
        percent,
        currency: g.currency,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
