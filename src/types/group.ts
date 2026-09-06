export type Group = {
  id: string;
  groupName: string;
  isUse: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
};

export type CreateGroupInput = {
  groupName: string;
  isUse?: boolean;
};

export type UpdateGroupInput = Partial<CreateGroupInput>;
