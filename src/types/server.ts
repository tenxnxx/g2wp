export type GameServer = {
  id: string;
  serverName: string;
  isUse: boolean;
  bossCount?: number;
};

export type CreateServerInput = {
  serverName: string;
  isUse?: boolean;
};

export type UpdateServerInput = Partial<CreateServerInput>;
