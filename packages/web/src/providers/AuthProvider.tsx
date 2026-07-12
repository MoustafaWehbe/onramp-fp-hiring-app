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
  findDemoRoleByCredentials,
  mockUsers,
} from "../data/users";
import { readStoredIntendedRole, resolveRole, storeIntendedRole } from "../lib/roles";
import type { AuthUser, PlatformRole } from "../types/users";

interface AuthContextValue {
  /** Signed-in user (backend session or clearly-flagged demo session). */
  user: AuthUser | null;
  /** Effective platform role driving nav and redirects. Null when logged out. */
  currentRole: PlatformRole | null;
  /** Role the visitor picked before auth; preserved through the flow. */
  intendedRole: PlatformRole | null;
  /** True while the demo (frontend-only) session is active. */
  isDemoSession: boolean;
  isLoading: boolean;
  setIntendedRole: (role: PlatformRole | null) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string) => Promise<void>;
  /** TEMPORARY: frontend-only session for UX testing; remove with backend roles. */
  loginAsDemoUser: (role: PlatformRole) => AuthUser;
  logout: () => Promise<void>;
}

const MOCK_USER_STORAGE_KEY = "hireflow.mockUser";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredMockUser(): AuthUser | null {
  try {
    const stored = window.localStorage.getItem(MOCK_USER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

function clearFrontendSession(): void {
  window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("refreshToken");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredMockUser());
  const [isDemoSession, setIsDemoSession] = useState<boolean>(
    () => readStoredMockUser() !== null,
  );
  const [intendedRole, setIntendedRoleState] = useState<PlatformRole | null>(
    () => readStoredIntendedRole(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Restore the backend session if one exists. A failing /auth/me must never
  // crash or hang the UI: it simply resolves to a logged-out (or demo) state.
  useEffect(() => {
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => {
        window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        setUser({ ...data.data });
        setIsDemoSession(false);
      })
      .catch(() => {
        // No backend session (or backend down) — keep any demo session.
        setUser((currentUser) => currentUser ?? readStoredMockUser());
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Backend roles are canonical uppercase (ADMIN/RECRUITER/INTERVIEWER/
  // CANDIDATE); resolveRole maps them to platform roles. The intendedRole
  // fallback only matters for the temporary demo session.
  const currentRole = useMemo(
    () => (user ? resolveRole(user.role, intendedRole) : null),
    [user, intendedRole],
  );

  const setIntendedRole = useCallback((role: PlatformRole | null): void => {
    storeIntendedRole(role);
    setIntendedRoleState(role);
  }, []);

  const loginAsDemoUser = useCallback((role: PlatformRole): AuthUser => {
    const demoUser = mockUsers[role];
    window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(demoUser));
    storeIntendedRole(role);
    setIntendedRoleState(role);
    setUser(demoUser);
    setIsDemoSession(true);
    return demoUser;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      try {
        const { data } = await apiClient.post<{
          data: { user: AuthUser };
        }>("/auth/login", { email, password });
        const nextUser = { ...data.data.user };
        window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        setUser(nextUser);
        setIsDemoSession(false);
        return nextUser;
      } catch (error) {
        // TEMPORARY demo fallback: the documented demo credentials work even
        // when the backend rejects them / is unreachable, so the role flows
        // stay testable frontend-only. Remove with backend role support.
        const demoRole = findDemoRoleByCredentials(email, password);
        if (demoRole) {
          return loginAsDemoUser(demoRole);
        }
        throw error;
      }
    },
    [loginAsDemoUser],
  );

  const register = useCallback(
    async (email: string, password: string, name: string): Promise<void> => {
      // TODO(backend-roles): the register endpoint now accepts an optional
      // role (CANDIDATE/RECRUITER/INTERVIEWER); wiring the picked intendedRole
      // through this call is UI work for the next branch. Until then the
      // picked role stays in intendedRole storage.
      await apiClient.post("/auth/register", { email, password, name });
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Backend unreachable or session already gone — still log out locally.
    } finally {
      clearFrontendSession();
      storeIntendedRole(null);
      setIntendedRoleState(null);
      setUser(null);
      setIsDemoSession(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      currentRole,
      intendedRole,
      isDemoSession,
      isLoading,
      setIntendedRole,
      login,
      register,
      loginAsDemoUser,
      logout,
    }),
    [
      user,
      currentRole,
      intendedRole,
      isDemoSession,
      isLoading,
      setIntendedRole,
      login,
      register,
      loginAsDemoUser,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return ctx;
}
