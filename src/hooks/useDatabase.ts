import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { getDatabase } from '../services/db';

export function useDatabase() {
  const [isReady, setIsReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    getDatabase()
      .then(() => setIsReady(true))
      .catch(setError);
  }, []);

  return { isReady, error };
}
