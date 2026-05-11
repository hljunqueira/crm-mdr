import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/", (req, res) => {
  const db = getDb();
  res.json(db.customers);
});

router.post("/", (req, res) => {
  const db = getDb();
  const newCustomer = {
    ...req.body,
    id: Math.random().toString(36).substring(2, 9)
  };
  db.customers.push(newCustomer);
  saveDb(db);
  res.status(201).json(newCustomer);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const index = db.customers.findIndex((c: any) => c.id === req.params.id);
  if (index !== -1) {
    db.customers[index] = { ...db.customers[index], ...req.body };
    saveDb(db);
    res.json(db.customers[index]);
  } else {
    res.status(404).json({ message: "Customer not found" });
  }
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.customers = db.customers.filter((c: any) => c.id !== req.params.id);
  saveDb(db);
  res.status(204).send();
});

export default router;
