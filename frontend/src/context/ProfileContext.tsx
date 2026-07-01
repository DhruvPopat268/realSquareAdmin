import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/axiosInterceptor";

export interface ProfileData {
  name: string;
  email: string;
  role: string;
  profilePhoto?: string;
  permissions: string[];
  isSuperAdmin: boolean;
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
      .then(res => {
        const data = res.data.data;
        const roleObj = typeof data.role === "object" && data.role !== null ? data.role : null;
        setProfile({
          name:         data.profile?.name  ?? "",
          email:        data.profile?.email ?? "",
          role:         roleObj?.name ?? "",
          profilePhoto: data.profile?.profilePhoto,
          permissions:  roleObj?.permissions ?? [],
          isSuperAdmin: data.isSuperAdmin ?? false,
          lastLogin:    data.lastLogin ?? null,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  const hasPermission = (key: string) => {
    if (!profile) return false;
    if (profile.isSuperAdmin) return true;
    return profile.permissions.includes(key);
  };

  return (
    <ProfileContext.Provider value={{ profile, hasPermission, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
