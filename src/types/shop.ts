export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  createdAt: number;
}

export interface ShopPurchase {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  purchasedAt: number;
}
