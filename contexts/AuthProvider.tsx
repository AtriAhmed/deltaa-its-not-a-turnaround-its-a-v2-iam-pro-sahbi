// File: /contexts/AuthProvider.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "@/utils/api";

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
  getUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(undefined);

  async function getUserStatus() {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${getBaseUrl()}/api/login/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      setUser(res.data);
    } catch (err) {
      setUser(null);
    }
  }

  useEffect(() => {
    getUserStatus();
  }, []);

  // Axios interceptor to attach token on every request
  axios.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem("token");
    config.headers.Authorization = token ? `Bearer ${token}` : "";
    return config;
  });

  return <AuthContext.Provider value={{ user, setUser, getUserStatus }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
