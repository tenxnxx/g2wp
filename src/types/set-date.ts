export type SetDate = {
  id: string;
  date: string;
  createBy: string;
  createdAt: string;
  updatedAt: string;
  eventCount?: number;
};

export type CreateSetDateInput = {
  date: string;
};

export type UpdateSetDateInput = Partial<CreateSetDateInput>;
