export type Item = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  safeCount?: number;
};

export type CreateItemInput = {
  name: string;
};

export type UpdateItemInput = Partial<CreateItemInput>;
