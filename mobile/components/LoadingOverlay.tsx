/**
 * LoadingOverlay.tsx
 * 
 * Elite Loading State Component
 * ─────────────────────────────────────
 * - Animated spinner with progress indicator
 * - Shows operation status (uploading, rendering, etc.)
 * - Estimated time remaining (if available)
 * - Cancel button for long operations
 * - Non-blocking, allows background interaction if needed
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  message?: string;
  progress?: number; // 0-100
  estimatedSeconds?: number;
  onCancel?: () => void;
  cancelable?: boolean;
  blocking?: boolean; // If true, dims background and prevents interaction
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  title = 'Processing',
  message = 'Please wait...',
  progress,
  estimatedSeconds,
  onCancel,
  cancelable = false,
  blocking = true,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(estimatedSeconds || 0);

  useEffect(() => {
    if (!estimatedSeconds || !visible) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedSeconds, visible]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!visible) return null;

  const screen = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancelable ? onCancel : undefined}
    >
      <View style={[
        styles.container,
        blocking ? styles.blockingOverlay : styles.transparentOverlay,
      ]}>
        {/* Spinner + Text */}
        <View style={styles.content}>
          <ActivityIndicator
            size="large"
            color="#4CAF50"
            style={styles.spinner}
          />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Progress bar (if progress prop provided) */}
          {progress !== undefined && progress >= 0 && (
            <View style={styles.progressContainer}>
              <View style={[
                styles.progressBar,
                { width: `${Math.min(progress, 100)}%` },
              ]} />
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}

          {/* Estimated time */}
          {estimatedSeconds && remainingSeconds > 0 && (
            <Text style={styles.estimatedTime}>
              Estimated: {formatTime(remainingSeconds)}
            </Text>
          )}

          {/* Cancel button */}
          {cancelable && onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockingOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  transparentOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  estimatedTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ff6b6b',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoadingOverlay;
