type Item = {
  amount: number;
  createdAt: string;
  expireTime: string;
  id: number;
  price: Nullable<number>;
  setting: {
    id: number;
    name: string;
    scale: number;
    range: number;
  };
};

declare namespace Gaming {
  type OpenItem = Item & {
    status: string;
  };

  type ClosedItem = Item & {
    closedPrice: Nullable<number>;
    status: string;
    nodeOfPrize: React.ReactNode;
  };
}
