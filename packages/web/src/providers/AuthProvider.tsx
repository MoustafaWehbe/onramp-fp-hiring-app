import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../lib/api-client";
import {
  readStoredIntendedRole,
  resolveRole,
  storeIntendedRole,
} from "../lib/roles";
import type { AuthUser, PlatformRole } from "../types/users";

interface AuthContextValue {
  /** Signed-in backend user, restored from the HttpOnly-cookie session. */
  user: AuthUser | null;
  /** Effective product role driving navigation and redirects. */
  currentRole: PlatformRole | null;
  /** Role the visitor picked before auth; preserved through the flow. */
  intendedRole: PlatformRole | null;
  isLoading: boolean;
  setIntendedRole: (role: PlatformRole | null) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    email: string,
    password: string,
    name: string,
    role: PlatformRole,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearFrontendSession(): void {
  // These keys belong to an older token-storage implementation. Cookies are
  // authoritative, but clearing them prevents a stale legacy session marker.
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("refreshToken");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [intendedRole, setIntendedRoleState] = useState<PlatformRole | null>(
    () => readStoredIntendedRole(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => setUser({ ...data.data }))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const currentRole = useMemo(
    () => (user ? resolveRole(user.role, intendedRole) : null),
    [user, intendedRole],
  );

  const setIntendedRole = useCallback((role: PlatformRole | null): void => {
    storeIntendedRole(role);
    setIntendedRoleState(role);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const { data } = await apiClient.post<{
        data: { user: AuthUser };
      }>("/auth/login", { email, password });
      const nextUser = { ...data.data.user };
      setUser(nextUser);
      return nextUser;
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: PlatformRole,
    ): Promise<void> => {
      await apiClient.post("/auth/register", {
        email,
        password,
        name,
        role: role.toUpperCase(),
      });
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // A missing/expired backend session should not prevent local logout.
    } finally {
      clearFrontendSession();
      storeIntendedRole(null);
      setIntendedRoleState(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      currentRole,
      intendedRole,
      isLoading,
      setIntendedRole,
      login,
      register,
      logout,
    }),
    [
      user,
      currentRole,
      intendedRole,
      isLoading,
      setIntendedRole,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return context;
}
