export type BehaviorMember = {
  id: string;
  name: string;
};

export type BehaviorPlayer = {
  id: string;
  name: string;
};

export type Behavior = {
  id: string;
  description: string;
  createBy: string;
  memberId: string;
  playerId: string;
  member: BehaviorMember;
  player: BehaviorPlayer;
  createdAt: string;
  updatedAt: string;
};

export type CreateBehaviorInput = {
  description: string;
  memberId: string;
  playerId: string;
};

export type UpdateBehaviorInput = Partial<CreateBehaviorInput>;
