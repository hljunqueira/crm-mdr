import { create } from 'zustand';
import { api } from '../lib/api';

export interface CreditCardBill {
  id: string;
  unit_id: string;
  day: number;
  description: string;
  start_month: number;
  start_year: number;
  total_installments: number;
  value: number;
  category: 'store' | 'personal';
  created_at?: string;
  updated_at?: string;
  current_installment?: number;
  remaining_installments?: number;
  is_paid?: boolean;
}

export interface FinancialForecast {
  id?: string;
  month: number;
  year: number;
  store_1_forecast: number;
  store_2_forecast: number;
  fixed_store_expenses: number;
  fixed_personal_expenses: number;
  card_payments_inflow: number;
}

interface FinancialDashboardState {
  bills: CreditCardBill[];
  forecast: FinancialForecast | null;
  isLoading: boolean;
  fetchDashboardData: (month: number, year: number, unitId?: string) => Promise<void>;
  createBill: (bill: Omit<CreditCardBill, 'id'>) => Promise<void>;
  updateBill: (id: string, bill: Partial<CreditCardBill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  toggleBillPayment: (id: string, month: number, year: number, pay: boolean) => Promise<void>;
  saveForecast: (forecast: FinancialForecast) => Promise<void>;
}

export const useFinancialDashboardStore = create<FinancialDashboardState>()((set, get) => ({
  bills: [],
  forecast: null,
  isLoading: false,

  fetchDashboardData: async (month, year, unitId) => {
    set({ isLoading: true });
    try {
      const unitParam = unitId && unitId !== 'all' ? `&unit_id=${unitId}` : '';
      const [billsData, forecastData] = await Promise.all([
        api.get(`/financial-dashboard/bills?month=${month}&year=${year}${unitParam}`),
        api.get(`/financial-dashboard/forecasts?month=${month}&year=${year}`)
      ]);
      set({ bills: billsData || [], forecast: forecastData || null });
    } catch (error) {
      console.error('Error fetching financial dashboard data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createBill: async (bill) => {
    try {
      await api.post('/financial-dashboard/bills', bill);
    } catch (error) {
      console.error('Error creating card bill:', error);
      throw error;
    }
  },

  updateBill: async (id, bill) => {
    try {
      await api.patch(`/financial-dashboard/bills/${id}`, bill);
    } catch (error) {
      console.error('Error updating card bill:', error);
      throw error;
    }
  },

  deleteBill: async (id) => {
    try {
      await api.delete(`/financial-dashboard/bills/${id}`);
      set((state) => ({ bills: state.bills.filter((b) => b.id !== id) }));
    } catch (error) {
      console.error('Error deleting card bill:', error);
      throw error;
    }
  },

  toggleBillPayment: async (id, month, year, pay) => {
    try {
      const res = await api.post(`/financial-dashboard/bills/${id}/pay`, { month, year, pay });
      set((state) => ({
        bills: state.bills.map((b) => b.id === id ? { ...b, is_paid: res.paid } : b)
      }));
    } catch (error) {
      console.error('Error toggling bill payment:', error);
      throw error;
    }
  },

  saveForecast: async (forecast) => {
    try {
      const data = await api.post('/financial-dashboard/forecasts', forecast);
      set({ forecast: data });
    } catch (error) {
      console.error('Error saving forecast:', error);
      throw error;
    }
  }
}));
