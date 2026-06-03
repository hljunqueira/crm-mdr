import { create } from 'zustand';
import { api } from '../lib/api';

export interface Sale {
  id: string;
  unit_id?: string;
  customer_id: string;
  customer_name?: string;
  device_model: string;
  imei: string;
  total_value: number;
  down_payment: number;
  service_fee?: number;
  original_price?: number;
  installments: number;
  date: string;
  device_color?: string;
  accessories?: string;
  status: 'completed' | 'processing' | 'overdue' | 'cancelled';
  payment_type?: 'crediario' | 'card' | 'vista';
}

interface SaleState {
  sales: Sale[];
  isLoading: boolean;
  fetchSales: (unitId?: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<any>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

export const useSaleStore = create<SaleState>()((set) => ({
  sales: [],
  isLoading: false,
  fetchSales: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/sales');
      const mappedSales = (data || []).map((s: any) => ({
        id: s.id,
        unit_id: s.store_id,
        customer_id: s.customer_id,
        customer_name: s.customers?.name || 'Cliente Removido',
        device_model: s.device_model_manual || 'Modelo não informado',
        imei: s.imei_manual || '',
        total_value: Number(s.total_value),
        down_payment: Number(s.down_payment),
        service_fee: Number(s.service_fee),
        original_price: Number(s.original_price),
        installments: s.installments_count,
        date: s.sale_date,
        device_color: s.device_color,
        accessories: s.accessories,
        status: s.status,
        payment_type: s.payment_type || 'crediario'
      }));
      set({ sales: mappedSales });
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addSale: async (sale) => {
    try {
      const dbSale = {
        store_id: sale.unit_id,
        customer_id: sale.customer_id,
        device_model_manual: sale.device_model,
        imei_manual: sale.imei,
        total_value: sale.total_value,
        down_payment: sale.down_payment,
        service_fee: sale.service_fee,
        original_price: sale.original_price,
        installments_count: sale.installments,
        sale_date: sale.date,
        device_color: sale.device_color,
        accessories: sale.accessories,
        status: sale.status,
        payment_type: sale.payment_type
      };
      const data = await api.post('/sales', dbSale);
      
      // Map back to frontend format
      const newSale = {
        ...sale,
        id: data.id,
        customer_name: sale.customer_name // Should be passed from form or fetched
      };
      
      set((state) => ({ sales: [newSale, ...state.sales] }));
      return data; // Return to get the ID
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  },
  updateSale: async (id, updatedFields) => {
    try {
      const dbFields: any = {};
      if (updatedFields.unit_id) dbFields.store_id = updatedFields.unit_id;
      if (updatedFields.customer_id) dbFields.customer_id = updatedFields.customer_id;
      if (updatedFields.device_model) dbFields.device_model_manual = updatedFields.device_model;
      if (updatedFields.imei) dbFields.imei_manual = updatedFields.imei;
      if (updatedFields.total_value !== undefined) dbFields.total_value = updatedFields.total_value;
      if (updatedFields.down_payment !== undefined) dbFields.down_payment = updatedFields.down_payment;
      if (updatedFields.service_fee !== undefined) dbFields.service_fee = updatedFields.service_fee;
      if (updatedFields.original_price !== undefined) dbFields.original_price = updatedFields.original_price;
      if (updatedFields.installments) dbFields.installments_count = updatedFields.installments;
      if (updatedFields.date) dbFields.sale_date = updatedFields.date;
      if (updatedFields.device_color) dbFields.device_color = updatedFields.device_color;
      if (updatedFields.accessories) dbFields.accessories = updatedFields.accessories;
      if (updatedFields.status) dbFields.status = updatedFields.status;
      if (updatedFields.payment_type) dbFields.payment_type = updatedFields.payment_type;

      const data = await api.patch(`/sales/${id}`, dbFields);
      
      set((state) => ({
        sales: state.sales.map((s) => s.id === id ? { ...s, ...updatedFields } : s)
      }));
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  },
  deleteSale: async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  },
}));
