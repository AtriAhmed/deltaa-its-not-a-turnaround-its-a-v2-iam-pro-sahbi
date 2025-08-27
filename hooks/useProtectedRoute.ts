// File: src/hooks/useProtectedRoute.ts
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthProvider';

export function useProtectedRoute() {
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // still checking token?
    if (user === undefined) return;

    // no user → send to login
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);
}
