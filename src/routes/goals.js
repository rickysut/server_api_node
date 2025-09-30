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
