import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    () => sessionStorage.getItem("biopay_token")
  );

  const [loading, setLoading] = useState(true);

  // Fetch logged-in user's profile
  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const response = await authAPI.getProfile(token);

      if (!response.success || !response.user) {
        throw new Error("Unable to retrieve user profile.");
      }

      setUser(response.user);
      return response.user;

    } catch (error) {
      console.error("Failed to fetch user profile:", error);

      sessionStorage.removeItem("biopay_token");
      setToken(null);
      setUser(null);

      throw error;
    }
  }, [token]);

  // Restore existing session
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // IMPORTANT: Pass JWT token to profile API
        const response = await authAPI.getProfile(token);

        if (!response.success || !response.user) {
          throw new Error("Unable to restore user session.");
        }

        if (mounted) {
          setUser(response.user);
        }

      } catch (error) {
        console.error("Session restoration failed:", error);

        if (mounted) {
          sessionStorage.removeItem("biopay_token");
          setToken(null);
          setUser(null);
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [token]);

  // Login
  const login = async (credentials) => {
    const response = await authAPI.login(credentials);

    const receivedToken = response.token;

    if (!response.success || !receivedToken) {
      throw new Error(
        response.message || "Authentication token was not received."
      );
    }

    // Save JWT token
    sessionStorage.setItem("biopay_token", receivedToken);

    // Update authentication state
    setUser(response.user);
    setToken(receivedToken);

    return response;
  };

  // Register
  const register = async (userData) => {
    return await authAPI.register(userData);
  };

  // Logout
  const logout = () => {
    sessionStorage.removeItem("biopay_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom authentication hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};