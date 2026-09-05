export type CheckEventStatus = "draft" | "open" | "closed";
export type CheckMemberStatus = "pending" | "approved" | "cancelled";

export type CheckEventCounts = {
  total: number;
  pending: number;
  approved: number;
  cancelled: number;
};

export type CheckEvent = {
  id: string;
  setDateId: string;
  setDate: {
    id: string;
    date: string;
  };
  title: string | null;
  status: CheckEventStatus;
  createBy: string;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: CheckEventCounts;
};

export type CreateCheckEventInput = {
  setDateId: string;
  title?: string | null;
};

export type UpdateCheckEventInput = {
  title?: string | null;
  setDateId?: string;
};

export type CheckEventMember = {
  id: string;
  checkEventId: string;
  memberId: string;
  memberNameSnapshot: string;
  status: CheckMemberStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    name: string;
    age: number;
    isLive: boolean;
  };
};

export type DecideCheckMemberInput = {
  status: "approved" | "cancelled";
};
