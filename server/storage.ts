import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "db.json");

// Initial Data (Empty as we transition to Supabase)
const initialData = {
  customers: [],
  sales: [],
  installments: [],
  leads: [],
  inventory: [],
  kanbanColumns: [],
  kanbanCards: [],
  units: []
};

export const getDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
};

export const saveDb = (data: any) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};
