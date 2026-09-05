export type Member = {
  id: string;
  name: string;
  age: number;
  facebookUrl: string | null;
  isLive: boolean;
  createBy: string;
  createdAt: string;
  updatedAt: string;
};

export type MemberDetailPlayer = {
  id: string;
  name: string;
  createBy: string;
  createdAt: string;
};

export type MemberDetailBehavior = {
  id: string;
  description: string;
  createBy: string;
  createdAt: string;
  player: {
    id: string;
    name: string;
  };
};

export type MemberDetail = Member & {
  playerCount: number;
  behaviorCount: number;
  players: MemberDetailPlayer[];
  behaviors: MemberDetailBehavior[];
};

export type CreateMemberInput = {
  name: string;
  age: number;
  facebookUrl?: string | null;
  isLive?: boolean;
};

export type UpdateMemberInput = Partial<CreateMemberInput>;
