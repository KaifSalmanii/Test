import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

interface Shop {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_open: boolean;
  is_active: boolean;
  delivery_enabled: boolean;
  color_ink_available: boolean;
  rates: {
    bw_a4?: number;
    color_a4?: number;
    bw_a3?: number;
    color_a3?: number;
    delivery_per_km?: number;
  };
  settings: {
    gst_rate?: number;
    open_time?: string;
    close_time?: string;
    phone?: string;
    address?: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: unknown;
  loading: boolean;
  shop: Shop | null;
  role: 'owner' | 'staff' | 'admin' | null;
  permissions: Record<string, boolean> | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  shop: null,
  role: null,
  permissions: null,
  signOut: async () => {},
  refreshAuth: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [role, setRole] = useState<'owner' | 'staff' | 'admin' | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

  const refreshAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user as User || null);
      
      if (session?.user) {
        // Get the first/latest shop for this user (not .single() which fails if multiple)
        const { data: shops, error } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', session.user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!error && shops && shops.length > 0) {
          setShop(shops[0] as Shop);
          setRole('owner');
        } else {
          setShop(null);
          setRole(null);
        }
      } else {
        setShop(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Auth refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setShop(null);
    setRole(null);
    setPermissions(null);
  };

  useEffect(() => {
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setShop(null);
        setRole(null);
        setLoading(true);
      } else if (event === 'SIGNED_IN') {
        refreshAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, shop, role, permissions, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);