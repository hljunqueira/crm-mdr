import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/", (req, res) => {
  const db = getDb();
  res.json(db.leads);
});

router.post("/", (req, res) => {
  const db = getDb();
  const newLead = {
    ...req.body,
    id: `L-${Math.floor(1000 + Math.random() * 9000)}`
  };
  db.leads.push(newLead);
  saveDb(db);
  res.status(201).json(newLead);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const index = db.leads.findIndex((l: any) => l.id === req.params.id);
  if (index !== -1) {
    db.leads[index] = { ...db.leads[index], ...req.body };
    saveDb(db);
    res.json(db.leads[index]);
  } else {
    res.status(404).json({ message: "Lead not found" });
  }
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.leads = db.leads.filter((l: any) => l.id !== req.params.id);
  saveDb(db);
  res.status(204).send();
});

export default router;
