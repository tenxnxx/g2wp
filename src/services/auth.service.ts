import { createClient } from "@/lib/supabase/client";

export type LoginInput = {
  email: string;
  password: string;
};

export const authService = {
  async login({ email, password }: LoginInput) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async logout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getSessionUser() {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    return user;
  },
};
