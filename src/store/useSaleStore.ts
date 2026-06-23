import { create } from 'zustand';
import { api } from '../lib/api';
import { useInventoryStore } from './useInventoryStore';
import { useAuthStore } from './useAuthStore';


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
  status: 'completed' | 'processing' | 'overdue' | 'cancelled' | 'waiting_pickup';
  payment_type?: 'crediario' | 'card' | 'vista' | 'debit';
  seller_id?: string;
  device_id?: string;
  is_trade_in?: boolean;
  trade_in_device_brand?: string;
  trade_in_device_model?: string;
  trade_in_device_imei?: string;
  trade_in_valuation?: number;
  trade_in_sale_price_estimate?: number;
  payment_method?: string;
  device_cost_price?: number;
}

interface SaleState {
  sales: Sale[];
  isLoading: boolean;
  fetchSales: (unitId?: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<any>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  confirmPickup: (id: string, paymentMethod: string, paymentType: string) => Promise<void>;
}

export const useSaleStore = create<SaleState>()((set) => ({
  sales: [],
  isLoading: false,
  fetchSales: async (unitId) => {
    set({ isLoading: true });
    try {
      const url = unitId && unitId !== 'all' ? `/sales?unit_id=${unitId}` : '/sales';
      const data = await api.get(url);
      const mappedSales = (data || []).map((s: any) => ({
        id: s.id,
        unit_id: s.store_id,
        customer_id: s.customer_id,
        device_id: s.device_id,
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
        payment_type: s.payment_type || 'crediario',
        payment_method: s.payment_method || 'money',
        seller_id: s.seller_id,
        is_trade_in: !!s.is_trade_in,
        trade_in_device_brand: s.trade_in_device_brand || '',
        trade_in_device_model: s.trade_in_device_model || '',
        trade_in_device_imei: s.trade_in_device_imei || '',
        trade_in_valuation: Number(s.trade_in_valuation) || 0,
        trade_in_sale_price_estimate: Number(s.trade_in_sale_price_estimate) || 0,
        device_cost_price: Number(s.devices?.cost_price) || 0
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
        device_id: sale.device_id || null,
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
        payment_type: sale.payment_type,
        payment_method: (sale as any).payment_method || 'money',
        seller_id: sale.seller_id,
        is_trade_in: sale.is_trade_in || false,
        trade_in_device_brand: sale.trade_in_device_brand || null,
        trade_in_device_model: sale.trade_in_device_model || null,
        trade_in_device_imei: sale.trade_in_device_imei || null,
        trade_in_valuation: sale.trade_in_valuation || 0,
        trade_in_sale_price_estimate: sale.trade_in_sale_price_estimate || 0
      };
      const data = await api.post('/sales', dbSale);
      
      // Map back to frontend format
      const newSale = {
        ...sale,
        id: data.id,
        customer_name: sale.customer_name // Should be passed from form or fetched
      };
      
      set((state) => ({ sales: [newSale, ...state.sales] }));
      useInventoryStore.getState().fetchInventory().catch(() => {});
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
      if (updatedFields.device_id !== undefined) dbFields.device_id = updatedFields.device_id || null;
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
      if ((updatedFields as any).payment_method) dbFields.payment_method = (updatedFields as any).payment_method;
      if (updatedFields.seller_id) dbFields.seller_id = updatedFields.seller_id;
      if (updatedFields.is_trade_in !== undefined) dbFields.is_trade_in = updatedFields.is_trade_in;
      if (updatedFields.trade_in_device_brand !== undefined) dbFields.trade_in_device_brand = updatedFields.trade_in_device_brand;
      if (updatedFields.trade_in_device_model !== undefined) dbFields.trade_in_device_model = updatedFields.trade_in_device_model;
      if (updatedFields.trade_in_device_imei !== undefined) dbFields.trade_in_device_imei = updatedFields.trade_in_device_imei;
      if (updatedFields.trade_in_valuation !== undefined) dbFields.trade_in_valuation = updatedFields.trade_in_valuation;
      if (updatedFields.trade_in_sale_price_estimate !== undefined) dbFields.trade_in_sale_price_estimate = updatedFields.trade_in_sale_price_estimate;

      const data = await api.patch(`/sales/${id}`, dbFields);
      
      set((state) => ({
        sales: state.sales.map((s) => (s.id === id ? {
          ...s,
          ...updatedFields,
          customer_name: s.customer_name
        } : s)),
      }));
      useInventoryStore.getState().fetchInventory().catch(() => {});
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  },
  deleteSale: async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id),
      }));
      useInventoryStore.getState().fetchInventory().catch(() => {});
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },
  confirmPickup: async (id, paymentMethod, paymentType) => {
    try {
      const data = await api.patch(`/sales/${id}/confirm-pickup`, {
        payment_method: paymentMethod,
        payment_type: paymentType
      });
      set((state) => ({
        sales: state.sales.map((s) => (s.id === id ? {
          ...s,
          status: 'completed',
          payment_method: paymentMethod,
          payment_type: paymentType as any
        } : s)),
      }));
    } catch (error) {
      console.error('Error confirming pickup:', error);
      throw error;
    }
  },
}));
