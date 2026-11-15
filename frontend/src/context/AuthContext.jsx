import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, setAuthToken, login as apiLogin, register as apiRegister } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserContext = async () => {
    try {
      const data = await getMe();
      setUser(data.user);
      setProfiles(data.profiles || []);
      
      // Auto-select first profile if none selected
      if (data.profiles && data.profiles.length > 0) {
        const savedProfileId = localStorage.getItem('carecircle_active_profile');
        const matched = data.profiles.find(p => p.id === Number(savedProfileId));
        setActiveProfile(matched || data.profiles[0]);
      } else {
        setActiveProfile(null);
      }
    } catch (err) {
      setUser(null);
      setProfiles([]);
      setActiveProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('carecircle_token');
    if (token) {
      fetchUserContext();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setAuthToken(data.token);
    await fetchUserContext();
    return data;
  };

  const register = async (userData) => {
    const data = await apiRegister(userData);
    setAuthToken(data.token);
    await fetchUserContext();
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('carecircle_active_profile');
    setUser(null);
    setProfiles([]);
    setActiveProfile(null);
  };

  const selectProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('carecircle_active_profile', profile.id);
  };

  const refreshProfiles = async () => {
    await fetchUserContext();
  };

  return (
    <AuthContext.Provider value={{
      user,
      profiles,
      activeProfile,
      loading,
      login,
      register,
      logout,
      selectProfile,
      refreshProfiles
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
