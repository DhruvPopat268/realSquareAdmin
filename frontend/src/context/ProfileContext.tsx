import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/axiosInterceptor";

export interface ProfileData {
  name: string;
  email: string;
  role: string;
  profilePhoto?: string;
  permissions: string[];
  lastLogin: string | null;
}

interface ProfileContextType {
  profile: ProfileData | null;
  hasPermission: (key: string) => boolean;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  hasPermission: () => false,
  refreshProfile: () => {},
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const refreshProfile = useCallback(() => {
    api.get("/admin/auth/me")
      .then(res => setProfile({
        name:         res.data.data.name,
        email:        res.data.data.email,
        role:         res.data.data.role,
        profilePhoto: res.data.data.profilePhoto,
        permissions:  res.data.data.permissions ?? [],
        lastLogin:    res.data.data.lastLogin ?? null,
      }))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  const hasPermission = (key: string) => {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    return profile.permissions.includes(key);
  };

  return (
    <ProfileContext.Provider value={{ profile, hasPermission, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
