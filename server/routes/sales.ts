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

export default router;
