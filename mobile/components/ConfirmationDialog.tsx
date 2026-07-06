/**
 * ConfirmationDialog.tsx
 * 
 * Elite Confirmation Dialog Component
 * ─────────────────────────────────────
 * - Prevents accidental risky actions
 * - Shows action impact/consequences
 * - Requires explicit confirmation
 * - Auto-disables confirm button if typing not completed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  severity?: 'warning' | 'danger' | 'info';
  requireTyping?: boolean; // User must type a phrase to confirm
  requirePhrase?: string;  // Phrase user must type
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  severity = 'warning',
  requireTyping = false,
  requirePhrase = 'confirm',
  loading = false,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');

  const handleConfirm = () => {
    if (requireTyping && typedPhrase.toLowerCase() !== requirePhrase.toLowerCase()) {
      Alert.alert('Incorrect', `Please type "${requirePhrase}" to confirm`);
      return;
    }
    setTypedPhrase('');
    onConfirm();
  };

  const handleCancel = () => {
    setTypedPhrase('');
    onCancel();
  };

  const isConfirmDisabled = requireTyping 
    ? typedPhrase.toLowerCase() !== requirePhrase.toLowerCase() 
    : false;

  const severityStyles = {
    warning: {
      titleColor: '#ff9800',
      confirmBg: '#ff9800',
      borderColor: '#ffe0b2',
    },
    danger: {
      titleColor: '#f44336',
      confirmBg: '#f44336',
      borderColor: '#ffcdd2',
    },
    info: {
      titleColor: '#2196F3',
      confirmBg: '#2196F3',
      borderColor: '#bbdefb',
    },
  };

  const style = severityStyles[severity];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { borderTopColor: style.borderColor }]}>
          {/* Icon + Title */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: style.titleColor }]}>
              {severity === 'danger' ? '⚠️' : severity === 'warning' ? '⚡' : 'ℹ️'} {title}
            </Text>
          </View>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Typing confirmation (if required) */}
          {requireTyping && (
            <>
              <Text style={styles.instructionText}>
                Type "{requirePhrase}" below to confirm:
              </Text>
              <TextInput
                style={styles.confirmInput}
                placeholder={`Type: ${requirePhrase}`}
                placeholderTextColor="#999"
                value={typedPhrase}
                onChangeText={setTypedPhrase}
                editable={!loading}
              />
              {typedPhrase && (
                <Text style={[
                  styles.matchText,
                  {
                    color: typedPhrase.toLowerCase() === requirePhrase.toLowerCase() 
                      ? '#4CAF50' 
                      : '#f44336',
                  },
                ]}>
                  {typedPhrase.toLowerCase() === requirePhrase.toLowerCase() 
                    ? '✓ Matches!' 
                    : '✗ Does not match'}
                </Text>
              )}
            </>
          )}

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: style.confirmBg },
                isConfirmDisabled && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isConfirmDisabled || loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Processing...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderTopWidth: 4,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    maxWidth: 320,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ConfirmationDialog;
