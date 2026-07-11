import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ShopItem, ShopPurchase } from '../types/shop';

interface ShopStore {
  items: ShopItem[];
  purchases: ShopPurchase[];
  addItem: (name: string, cost: number, oneTime?: boolean) => boolean;
  updateItem: (itemId: string, name: string, cost: number, oneTime?: boolean) => boolean;
  removeItem: (itemId: string) => boolean;
  buyItem: (itemId: string, availableBalance: number) => boolean;
  undoPurchase: (purchaseId: string) => boolean;
}

export const useShopStore = create<ShopStore>()(
  persist(
    (set, get) => ({
      items: [],
      purchases: [],
      addItem: (name, cost, oneTime) => {
        const trimmedName = name.trim();
        const normalizedCost = Math.round(cost);
        if (!trimmedName || !Number.isFinite(normalizedCost) || normalizedCost <= 0) return false;

        set(state => ({
          items: [
            ...state.items,
            {
              id: uuidv4(),
              name: trimmedName,
              cost: normalizedCost,
              createdAt: Date.now(),
              oneTime: oneTime ? true : undefined,
            },
          ],
        }));
        return true;
      },
      updateItem: (itemId, name, cost, oneTime) => {
        const trimmedName = name.trim();
        const normalizedCost = Math.round(cost);
        if (!trimmedName || !Number.isFinite(normalizedCost) || normalizedCost <= 0) return false;
        if (!get().items.some(item => item.id === itemId)) return false;

        set(state => ({
          items: state.items.map(item =>
            item.id === itemId
              ? { ...item, name: trimmedName, cost: normalizedCost, oneTime: oneTime ? true : undefined }
              : item,
          ),
        }));
        return true;
      },
      removeItem: itemId => {
        if (!get().items.some(item => item.id === itemId)) return false;
        set(state => ({ items: state.items.filter(item => item.id !== itemId) }));
        return true;
      },
      buyItem: (itemId, availableBalance) => {
        const item = get().items.find(candidate => candidate.id === itemId);
        if (!item || !Number.isFinite(availableBalance) || item.cost > availableBalance) return false;

        set(state => ({
          purchases: [
            ...state.purchases,
            {
              id: uuidv4(),
              itemId: item.id,
              itemName: item.name,
              cost: item.cost,
              purchasedAt: Date.now(),
              oneTime: item.oneTime,
              itemCreatedAt: item.createdAt,
            },
          ],
          items: item.oneTime ? state.items.filter(candidate => candidate.id !== item.id) : state.items,
        }));
        return true;
      },
      undoPurchase: purchaseId => {
        const purchase = get().purchases.find(candidate => candidate.id === purchaseId);
        if (!purchase) return false;

        set(state => ({
          purchases: state.purchases.filter(candidate => candidate.id !== purchaseId),
          items:
            purchase.oneTime && !state.items.some(item => item.id === purchase.itemId)
              ? [
                  ...state.items,
                  {
                    id: purchase.itemId,
                    name: purchase.itemName,
                    cost: purchase.cost,
                    createdAt: purchase.itemCreatedAt ?? purchase.purchasedAt,
                    oneTime: true,
                  },
                ]
              : state.items,
        }));
        return true;
      },
    }),
    {
      name: 'recupero-shop',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
