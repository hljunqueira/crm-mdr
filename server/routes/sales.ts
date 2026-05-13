import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/", (req, res) => {
  const db = getDb();
  res.json(db.sales);
});

router.post("/", (req, res) => {
  const db = getDb();
  const newSale = {
    ...req.body,
    id: `S-${Math.floor(1000 + Math.random() * 9000)}`
  };
  db.sales.push(newSale);
  saveDb(db);
  res.status(201).json(newSale);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const index = db.sales.findIndex((s: any) => s.id === req.params.id);
  if (index !== -1) {
    db.sales[index] = { ...db.sales[index], ...req.body };
    saveDb(db);
    res.json(db.sales[index]);
  } else {
    res.status(404).json({ message: "Sale not found" });
  }
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.sales = db.sales.filter((s: any) => s.id !== req.params.id);
  saveDb(db);
  res.status(204).send();
});

export default router;
