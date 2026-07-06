import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../lib/api-client";
import { mockUsers, normalizeRole } from "../data/users";
import type { AuthUser, PlatformRole, UserRole } from "../types/users";

interface AuthContextValue {
  user: AuthUser | null;
  currentRole: PlatformRole | null;
  isLoading: boolean;
  enterAsRole: (role: PlatformRole) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const MOCK_USER_STORAGE_KEY = "hireflow.mockUser";

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    role: (user.role ?? "candidate") as UserRole,
  };
}

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => {
        const nextUser = toAuthUser(data.data);
        window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        setUser(nextUser);
      })
      .catch(() => {
        setUser((currentUser) => currentUser ?? readStoredMockUser());
      })
      .finally(() => setIsLoading(false));
  }, []);

  const currentRole = useMemo(() => normalizeRole(user?.role), [user?.role]);

  function enterAsRole(role: PlatformRole): void {
    const mockUser = mockUsers[role];
    window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }

  async function login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<{
      data: { user: AuthUser };
    }>("/auth/login", { email, password });
    const nextUser = toAuthUser(data.data.user);
    window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
    setUser(nextUser);
    return nextUser;
  }

  async function register(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    await apiClient.post("/auth/register", { email, password, name });
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      clearFrontendSession();
    } finally {
      clearFrontendSession();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentRole,
        isLoading,
        enterAsRole,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return ctx;
}
