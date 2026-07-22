import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  role: "admin" | "lider" | "creador" | "vendedor" | "observador";
  first_name: string;
  phone: string;
  active: boolean;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_ev, s) => {
      setSession(s);
      await loadProfile(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Racha: registrar actividad del día (calendario de Córdoba, no UTC)
  useEffect(() => {
    if (!session) return;
    import("./format").then(({ hoyCordoba }) => {
      supabase.from("daily_activity")
        .upsert({ user_id: session.user.id, day: hoyCordoba() }, { onConflict: "user_id,day", ignoreDuplicates: true })
        .then(() => {});
    });
  }, [session?.user.id]);

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        isStaff: !!profile && ["admin", "lider"].includes(profile.role),
        refreshProfile: () => loadProfile(session),
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
