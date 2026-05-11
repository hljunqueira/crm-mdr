import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Routes
import customerRoutes from "./server/routes/customers.js";
import saleRoutes from "./server/routes/sales.js";
import financeRoutes from "./server/routes/finance.js";
import leadRoutes from "./server/routes/leads.js";
import kanbanRoutes from "./server/routes/kanban.js";
import inventoryRoutes from "./server/routes/inventory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.use("/api/customers", customerRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/finance", financeRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/kanban", kanbanRoutes);
  app.use("/api/inventory", inventoryRoutes);

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
