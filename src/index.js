import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { router as authRouter } from "./routes/auth.js";
import { router as expensesRouter } from "./routes/expenses.js";
import { router as loansRouter } from "./routes/loan-repayments.js";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "grad-finance-tracker-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/loans", loansRouter);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
