export type Safe = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  description: string | null;
  depositItemAt: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSafeInput = {
  itemId: string;
  quantity: number;
  description?: string | null;
  depositItemAt: string;
  memberId: string;
};

export type UpdateSafeInput = Partial<CreateSafeInput>;
