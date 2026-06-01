import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";

// Routes
import customerRoutes from "./server/routes/customers.js";
import saleRoutes from "./server/routes/sales.js";
import financeRoutes from "./server/routes/finance.js";
import leadRoutes from "./server/routes/leads.js";
import kanbanRoutes from "./server/routes/kanban.js";
import inventoryRoutes from "./server/routes/inventory.js";
import unitsRoutes from "./server/routes/units.js";
import webhookRoutes from "./server/routes/webhooks.js";
import evolutionRoutes from "./server/routes/evolution.js";
import aiRoutes from "./server/routes/ai.js";
import chatRoutes from "./server/routes/chat.js";
import usersRoutes from "./server/routes/users.js";
import serviceOrderRoutes from "./server/routes/service_orders.js";
import fiscalRoutes from "./server/routes/fiscal.js";
import deviceLockRoutes from "./server/routes/device_locks.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cors());

  // API Health Check / Root
  app.get("/api/health", (req, res) => {
    res.json({ 
      message: "MDR Informática e Celulares - API",
      version: "1.0.0",
      status: "online",
      env: process.env.NODE_ENV,
      supabase: {
        url: process.env.VITE_SUPABASE_URL ? "Configured" : "Missing",
        key: process.env.VITE_SUPABASE_ANON_KEY ? "Configured" : "Missing"
      }
    });
  });

  // API Routes
  app.use("/api/customers", customerRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/finance", financeRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/kanban", kanbanRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/units", unitsRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/evolution", evolutionRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/os", serviceOrderRoutes);
  app.use("/api/fiscal", fiscalRoutes);
  app.use("/api/device-locks", deviceLockRoutes);


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
