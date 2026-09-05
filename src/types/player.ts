export type PlayerMember = {
  id: string;
  name: string;
};

export type Player = {
  id: string;
  name: string;
  memberId: string;
  member: PlayerMember;
  createBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlayerInput = {
  name: string;
  memberId: string;
};

export type UpdatePlayerInput = Partial<CreatePlayerInput>;
