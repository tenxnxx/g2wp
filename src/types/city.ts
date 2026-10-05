export type City = {
  id: string;
  cityName: string;
  isUse: boolean;
  bossCount?: number;
};

export type CreateCityInput = {
  cityName: string;
  isUse?: boolean;
};

export type UpdateCityInput = Partial<CreateCityInput>;
