import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/columns", (req, res) => {
  const db = getDb();
  res.json(db.kanbanColumns);
});

router.get("/cards", (req, res) => {
  const db = getDb();
  res.json(db.kanbanCards);
});

router.post("/cards", (req, res) => {
  const db = getDb();
  const newCard = {
    ...req.body,
    id: `card-${Math.floor(1000 + Math.random() * 9000)}`
  };
  db.kanbanCards.push(newCard);
  saveDb(db);
  res.status(201).json(newCard);
});

router.patch("/cards/:id", (req, res) => {
  const db = getDb();
  const index = db.kanbanCards.findIndex((c: any) => c.id === req.params.id);
  if (index !== -1) {
    db.kanbanCards[index] = { ...db.kanbanCards[index], ...req.body };
    saveDb(db);
    res.json(db.kanbanCards[index]);
  } else {
    res.status(404).json({ message: "Card not found" });
  }
});

router.delete("/cards/:id", (req, res) => {
  const db = getDb();
  db.kanbanCards = db.kanbanCards.filter((c: any) => c.id !== req.params.id);
  saveDb(db);
  res.status(204).send();
});

export default router;
