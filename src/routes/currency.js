import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import Joi from "joi";
import { requireAuth } from "../middleware/auth.js";
import pool from "../db.js";

export const router = express.Router();

const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hour
const schema = Joi.object({
  from: Joi.string().length(3).uppercase().required(),
  to: Joi.string().length(3).uppercase().required(),
  amount: Joi.number().positive().required(),
});

async function fetchRates(base) {
  const key = `rates:${base}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const url =
    process.env.FX_RATES_URL || "https://open.er-api.com/v6/latest/USD";
  const { data } = await axios.get(url, { params: { base } });
  if (!data || !data.rates) throw new Error("Rates unavailable");
  cache.set(key, data.rates, 60 * 60);
  return data.rates;
}

router.get("/convert", requireAuth, async (req, res) => {
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });
  const { from, to, amount } = value;
  try {
    const rates = await fetchRates(from);
    const rate = rates[to];
    if (!rate) return res.status(400).json({ message: "Unsupported currency" });
    res.json({ amount: amount * rate, rate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Conversion failed" });
  }
});

router.post("/base", requireAuth, async (req, res) => {
  const bodySchema = Joi.object({
    baseCurrency: Joi.string().length(3).uppercase().required(),
  });
  const { error, value } = bodySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  try {
    await pool.query("UPDATE users SET base_currency=? WHERE id=?", [
      value.baseCurrency,
      req.user.id,
    ]);
    res.json({ message: "Base currency updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});
