import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "db.json");

// Initial Data
const initialData = {
  customers: [
    {
      id: '1',
      name: 'Henrique Linhares',
      cpf: '123.456.789-00',
      phone: '(48) 99988-7766',
      address: 'Centro, Araranguá - SC',
      status: 'active',
      lastPayment: '2024-05-01'
    },
    {
      id: '2',
      name: 'Ana Paula Silva',
      cpf: '987.654.321-11',
      phone: '(48) 98877-6655',
      address: 'Balneário Arroio do Silva - SC',
      status: 'overdue',
      lastPayment: '2024-03-15'
    }
  ],
  sales: [
    {
      id: 'S-1001',
      customerId: '1',
      customerName: 'Henrique Linhares',
      deviceModel: 'iPhone 15 Pro Max',
      imei: '354215897452136',
      totalValue: 7500,
      downPayment: 2000,
      installments: 12,
      date: '2024-05-01',
      status: 'completed'
    }
  ],
  installments: [
    {
      id: 'P-101',
      customerName: 'Henrique Linhares',
      saleId: 'S-1001',
      number: 3,
      total: 12,
      value: 458.33,
      dueDate: '2024-05-10',
      status: 'paid'
    },
    {
      id: 'P-102',
      customerName: 'Ana Paula Silva',
      saleId: 'S-1002',
      number: 2,
      total: 10,
      value: 470.00,
      dueDate: '2024-05-15',
      status: 'pending'
    }
  ],
  leads: [
    {
      id: 'L-1',
      name: 'Carlos Mendes',
      phone: '(48) 99123-4567',
      email: 'carlos@email.com',
      message: 'Interesse em iPhone 15',
      status: 'new',
      date: '2024-05-10'
    }
  ],
  inventory: [
    {
      id: 'D-1',
      model: 'iPhone 15 Pro Max',
      brand: 'Apple',
      imei: '354215897452136',
      price: 7500,
      condition: 'new',
      status: 'sold'
    },
    {
      id: 'D-2',
      model: 'Samsung S24 Ultra',
      brand: 'Samsung',
      imei: '358741258963214',
      price: 6800,
      condition: 'new',
      status: 'available'
    }
  ],
  kanbanColumns: [
    { id: 'col-1', title: 'Novos Leads', order: 0 },
    { id: 'col-2', title: 'Em Contato', order: 1 },
    { id: 'col-3', title: 'Negociação', order: 2 },
    { id: 'col-4', title: 'Fechado', order: 3 }
  ],
  kanbanCards: [
    {
      id: 'card-1',
      columnId: 'col-1',
      title: 'Carlos Mendes - iPhone 15',
      value: 7500,
      priority: 'Alta',
      customerName: 'Carlos Mendes'
    }
  ]
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
