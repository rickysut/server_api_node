import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Check email availability
router.get("/check-email", async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ message: error.message });
  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [
      value.email,
    ]);
    const available = rows.length === 0;
    res.json({ available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { name, email, password } = value;
  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, base_currency) VALUES (?, ?, ?, ?)",
      [name, email, hashed, "USD"]
    );
    const userId = result.insertId;
    const token = jwt.sign(
      { sub: userId },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { email, password } = value;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: "Invalid credentials" });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { sub: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  // JWT stateless logout handled on client (discard token)
  res.json({ message: "Logged out" });
});

// Get user profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, base_currency FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
