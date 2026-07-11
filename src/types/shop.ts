export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  createdAt: number;
  oneTime?: true;
}

export interface ShopPurchase {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  purchasedAt: number;
  oneTime?: true;
  itemCreatedAt?: number;
}
