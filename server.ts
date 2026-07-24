import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

// Routes
import customerRoutes from "./server/routes/customers.js";
import saleRoutes from "./server/routes/sales.js";
import financeRoutes from "./server/routes/finance.js";
import leadRoutes from "./server/routes/leads.js";
import kanbanRoutes from "./server/routes/kanban.js";
import inventoryRoutes from "./server/routes/inventory.js";
import inventoryAuditRoutes from "./server/routes/inventory_audits.js";
import unitsRoutes from "./server/routes/units.js";
import supplierRoutes from "./server/routes/suppliers.js";
import partnerRoutes from "./server/routes/partners.js";
import webhookRoutes from "./server/routes/webhooks.js";
import evolutionRoutes from "./server/routes/evolution.js";
import aiRoutes from "./server/routes/ai.js";
import chatRoutes from "./server/routes/chat.js";
import usersRoutes from "./server/routes/users.js";
import serviceOrderRoutes from "./server/routes/service_orders.js";
import fiscalRoutes from "./server/routes/fiscal.js";
import deviceLockRoutes from "./server/routes/device_locks.js";
import billingRoutes from "./server/routes/billing.js";
import scpRoutes from "./server/routes/scp.js";
import financialDashboardRoutes from "./server/routes/financial_dashboard.js";
import commissionRoutes from "./server/routes/commissions.js";
import { cashierRouter } from "./server/routes/cashier.js";
import { checkAndReactivateAsaasWebhook } from "./server/services/asaasService.js";




let activeFilename = '';
let activeDirname = '';
try {
  activeFilename = fileURLToPath(import.meta.url);
  activeDirname = path.dirname(activeFilename);
} catch (e) {
  activeFilename = __filename;
  activeDirname = __dirname;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3009;

  // Hardening de segurança com Helmet
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // Rate Limiter Geral (500 requisições / 15 min)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Muitas requisições vindas deste IP. Tente novamente em 15 minutos." }
  });
  app.use(globalLimiter);

  // Rate Limiter Rígido para rotas críticas (15 tentativas / 10 min)
  const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Muitas tentativas de autenticação ou ações sensíveis a partir deste IP. Tente novamente em 10 minutos." }
  });

  app.use("/api/users/verify-password", authLimiter);
  app.use("/api/users/verify-admin-password", authLimiter);
  app.use("/api/scp/auth/request-otp", authLimiter);
  app.use("/api/scp/withdraw", authLimiter);

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
  app.use("/api/inventory-audits", inventoryAuditRoutes);
  app.use("/api/units", unitsRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/partners", partnerRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/evolution", evolutionRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/os", serviceOrderRoutes);
  app.use("/api/fiscal", fiscalRoutes);
  app.use("/api/device-locks", deviceLockRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/scp", scpRoutes);
  app.use("/api/financial-dashboard", financialDashboardRoutes);
  app.use("/api/commissions", commissionRoutes);
  app.use("/api/cashier", cashierRouter);


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(activeDirname, "dist"))
      ? path.join(activeDirname, "dist")
      : path.join(activeDirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
// Sincronização offline desativada - Operando 100% via Supabase (Nuvem)
    
    // Monitoramento do webhook do Asaas para auto-reativação em caso de instabilidades
    checkAndReactivateAsaasWebhook().catch(err => console.error("Erro na ativação inicial do webhook Asaas:", err));
    // Checar a cada 4 horas
    setInterval(() => {
      checkAndReactivateAsaasWebhook().catch(err => console.error("Erro no intervalo do webhook Asaas:", err));
    }, 4 * 60 * 60 * 1000);
  });
}


startServer();
