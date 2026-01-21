export type User = {
  id?: number;   
  email: string;
  nickname: string;
  created_at: string;
  email_verified: boolean;
  last_login: string | null;
  role: "user" | "admin";
  theme: "light" | "dark" | "system";
  bio: string | null;
  is_premium: boolean;
  premium_until: string | null;
  premium_tier: string | null;
  avatar_style: string; 
  avatar_seed: string; 
  avatar_format: "svg" | "gif";
  avatar_frame?: string;
};
