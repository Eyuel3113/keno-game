import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, walletApi } from '../api';
import { useStore } from '../store';
import type { ToastType } from '../context/ToastContext';

type ToastFn = (msg: string, type?: ToastType) => void;

export const useAuth = () => {
  const { setUser, setToken, setBalance, logout } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string, toastFn?: ToastFn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      const { token, user, balance } = res.data;
      setToken(token);
      setUser(user);
      setBalance(balance);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please check your credentials.';
      setError(msg);
      toastFn?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, toastFn?: ToastFn) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.register(email, password);
      // Don't navigate — caller will show "check your email" UI
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(msg);
      toastFn?.(msg, 'error');
      throw err; // re-throw so caller knows it failed
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string, toastFn?: ToastFn) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
      toastFn?.(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string, toastFn?: ToastFn) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Password reset failed. Please try again.';
      setError(msg);
      toastFn?.(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const fetchBalance = async () => {
    try {
      const res = await walletApi.getBalance();
      setBalance(res.data.balance);
    } catch {
      // ignore
    }
  };

  return { login, register, forgotPassword, resetPassword, signOut, fetchBalance, loading, error, setError };
};
