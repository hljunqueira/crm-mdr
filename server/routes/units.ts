import { Router } from "express";
import { getDb, saveDb } from "../storage.js";

const router = Router();

router.get("/:id", (req, res) => {
  const db = getDb();
  const unit = db.units?.find((u: any) => u.id === req.params.id) || db.stores?.find((s: any) => s.id === req.params.id);
  if (unit) {
    res.json(unit);
  } else {
    // Return a default if not found to avoid breaking UI
    res.json({ id: req.params.id, name: "MDR Celulares" });
  }
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  // Check both units and stores as they might be used interchangeably in this mockup
  let list = db.units || db.stores || [];
  const index = list.findIndex((u: any) => u.id === req.params.id);
  if (index !== -1) {
    list[index] = { ...list[index], ...req.body };
    saveDb(db);
    res.json(list[index]);
  } else {
    res.status(404).json({ message: "Unit not found" });
  }
});

export default router;
