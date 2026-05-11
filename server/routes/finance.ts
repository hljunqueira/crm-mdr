import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/installments", (req, res) => {
  const db = getDb();
  res.json(db.installments);
});

router.post("/installments", (req, res) => {
  const db = getDb();
  const newInstallments = req.body; // Expects an array
  if (Array.isArray(newInstallments)) {
    db.installments.push(...newInstallments);
  } else {
    db.installments.push(newInstallments);
  }
  saveDb(db);
  res.status(201).json(newInstallments);
});

router.patch("/installments/:id", (req, res) => {
  const db = getDb();
  const index = db.installments.findIndex((i: any) => i.id === req.params.id);
  if (index !== -1) {
    db.installments[index] = { ...db.installments[index], ...req.body };
    saveDb(db);
    res.json(db.installments[index]);
  } else {
    res.status(404).json({ message: "Installment not found" });
  }
});

export default router;
