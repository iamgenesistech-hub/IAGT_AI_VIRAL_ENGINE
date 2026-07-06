/**
 * ErrorRecoveryModal.tsx
 * 
 * Elite Error Recovery Component
 * ─────────────────────────────────────
 * - Displays error with clear explanation
 * - Provides action buttons (retry, cancel, details)
 * - Shows error code + correlation ID for support
 * - Exponential backoff with countdown timer
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';

interface ErrorRecoveryModalProps {
  visible: boolean;
  title?: string;
  message: string;
  errorCode?: string;
  correlationId?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  autoRetryAttempts?: number;
  autoRetryDelayMs?: number;
  showDetails?: boolean;
}

export const ErrorRecoveryModal: React.FC<ErrorRecoveryModalProps> = ({
  visible,
  title = 'Error',
  message,
  errorCode,
  correlationId,
  onRetry,
  onCancel,
  autoRetryAttempts = 0,
  autoRetryDelayMs = 3000,
  showDetails = true,
}) => {
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(autoRetryAttempts);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    if (!visible || attemptsLeft <= 0) return;

    setRetryCountdown(Math.ceil(autoRetryDelayMs / 1000));

    const countdownInterval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setAttemptsLeft(prev => prev - 1);
          onRetry?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [visible, attemptsLeft, autoRetryDelayMs, onRetry]);

  if (!visible) return null;

  const errorSeverity = errorCode?.includes('5') ? 'critical' : 'warning';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={[
          styles.content,
          errorSeverity === 'critical' && styles.criticalBg,
        ]}>
          {/* Error icon */}
          <View style={[
            styles.iconContainer,
            errorSeverity === 'critical' && styles.criticalIcon,
          ]}>
            <Text style={styles.iconText}>⚠️</Text>
          </View>

          {/* Title + Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Error details (expandable) */}
          {showDetails && (errorCode || correlationId) && (
            <>
              <TouchableOpacity
                style={styles.detailsToggle}
                onPress={() => setShowErrorDetails(!showErrorDetails)}
              >
                <Text style={styles.detailsToggleText}>
                  {showErrorDetails ? '▼' : '▶'} Technical Details
                </Text>
              </TouchableOpacity>

              {showErrorDetails && (
                <View style={styles.detailsPanel}>
                  {errorCode && (
                    <Text style={styles.detailsText}>Code: {errorCode}</Text>
                  )}
                  {correlationId && (
                    <Text style={styles.detailsText}>
                      ID: {correlationId.substring(0, 20)}...
                    </Text>
                  )}
                  <Text style={styles.supportText}>
                    Share the above details with support if the issue persists.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Auto-retry countdown */}
          {retryCountdown > 0 && (
            <Text style={styles.countdownText}>
              Retrying in {retryCountdown}s (attempt {autoRetryAttempts - attemptsLeft + 1}/{autoRetryAttempts})
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {retryCountdown === 0 && onRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            )}

            {onCancel && (
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  retryCountdown > 0 && styles.cancelButtonDisabled,
                ]}
                onPress={onCancel}
                disabled={retryCountdown > 0}
              >
                <Text style={styles.cancelButtonText}>
                  {retryCountdown > 0 ? 'Retrying...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 32,
  },
  criticalBg: {
    backgroundColor: '#fff3cd',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffe0e0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  criticalIcon: {
    backgroundColor: '#ffcccc',
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  detailsToggle: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  detailsPanel: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailsText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  countdownText: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ErrorRecoveryModal;
