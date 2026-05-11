import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/", (req, res) => {
  const db = getDb();
  res.json(db.inventory);
});

router.post("/", (req, res) => {
  const db = getDb();
  const newItem = {
    ...req.body,
    id: `D-${Math.floor(1000 + Math.random() * 9000)}`
  };
  db.inventory.push(newItem);
  saveDb(db);
  res.status(201).json(newItem);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const index = db.inventory.findIndex((i: any) => i.id === req.params.id);
  if (index !== -1) {
    db.inventory[index] = { ...db.inventory[index], ...req.body };
    saveDb(db);
    res.json(db.inventory[index]);
  } else {
    res.status(404).json({ message: "Item not found" });
  }
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.inventory = db.inventory.filter((i: any) => i.id !== req.params.id);
  saveDb(db);
  res.status(204).send();
});

export default router;
