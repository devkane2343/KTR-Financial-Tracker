import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

const STORAGE_KEY_PREFIX = 'ktr_privacy_accepted_';
const STORAGE_REFRESH_COUNT = 'ktr_refresh_count_';
const REFRESH_INTERVAL = 10; // Show modal every 10 refreshes

interface PrivacyNoticeState {
  shouldShow: boolean;
  handleAccept: () => void;
}

export const usePrivacyNotice = (user: User | null): PrivacyNoticeState => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!user) {
      setShouldShow(false);
      return;
    }

    const userId = user.id;
    const acceptedKey = `${STORAGE_KEY_PREFIX}${userId}`;
    const refreshCountKey = `${STORAGE_REFRESH_COUNT}${userId}`;

    try {
      // Check if user has ever accepted the privacy notice
      const hasAccepted = localStorage.getItem(acceptedKey);
      
      if (!hasAccepted) {
        // First-time user - show the modal
        setShouldShow(true);
        return;
      }

      // Existing user - check refresh count
      const refreshCountStr = localStorage.getItem(refreshCountKey) || '0';
      let refreshCount = parseInt(refreshCountStr, 10);
      
      // Increment refresh count
      refreshCount += 1;
      
      if (refreshCount >= REFRESH_INTERVAL) {
        // Show modal and reset counter
        setShouldShow(true);
        localStorage.setItem(refreshCountKey, '0');
      } else {
        // Don't show modal, just update counter
        localStorage.setItem(refreshCountKey, refreshCount.toString());
        setShouldShow(false);
      }
    } catch (error) {
      console.error('Error checking privacy notice status:', error);
      setShouldShow(false);
    }
  }, [user]);

  const handleAccept = () => {
    if (!user) return;

    const userId = user.id;
    const acceptedKey = `${STORAGE_KEY_PREFIX}${userId}`;
    const refreshCountKey = `${STORAGE_REFRESH_COUNT}${userId}`;

    try {
      // Mark as accepted
      localStorage.setItem(acceptedKey, 'true');
      // Reset refresh counter
      localStorage.setItem(refreshCountKey, '0');
      // Hide modal
      setShouldShow(false);
    } catch (error) {
      console.error('Error saving privacy acceptance:', error);
    }
  };

  return {
    shouldShow,
    handleAccept,
  };
};
