import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { router as authRouter } from "./routes/auth.js";
import { router as expensesRouter } from "./routes/expenses.js";
import { router as loansRouter } from "./routes/loans.js";
import { router as goalsRouter } from "./routes/goals.js";
import { router as currencyRouter } from "./routes/currency.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "grad-finance-tracker-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/loans", loansRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/currency", currencyRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
