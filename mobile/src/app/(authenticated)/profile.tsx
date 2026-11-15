import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { getProfile, type AuthUser } from '@/services/auth-api';
import { changeAccountPassword } from '@/services/profile-api';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';

type ProfileData = AuthUser & { createdAt?: string };

export default function ProfileScreen() {
  const { user, accessToken } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [profile, setProfile] = useState<ProfileData | null>(user as ProfileData | null);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [profileError, setProfileError] = useState('');
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    if (!accessToken) {
      setLoading(false);
      setProfileError('Your session is unavailable. Please sign in again.');
      return;
    }
    if (!silent) {
      setLoading(true);
      setProfileError('');
    }
    try {
      const result = await getProfile(accessToken);
      setProfile(result as ProfileData);
      setProfileError('');
    } catch (error) {
      if (!silent) setProfileError(error instanceof Error ? error.message : 'Could not load profile.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadProfile(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(true), [loadProfile]);
  useAppAutoRefresh(refreshProfile, 10000, !passwordFormOpen && !saving);

  const submitPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword === oldPassword) {
      setPasswordError('Choose a new password that differs from your current password.');
      return;
    }
    if (!accessToken) {
      setPasswordError('Your session is unavailable. Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      const result = await changeAccountPassword(accessToken, oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(result?.message || 'Password changed successfully.');
      setPasswordFormOpen(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  const closePasswordForm = () => {
    if (saving) return;
    setPasswordFormOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const fullName = profile?.name?.trim() || 'Name unavailable';
  const initials = fullName === 'Name unavailable'
    ? '?'
    : fullName.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'user' ? 'User' : profile?.role || 'Role unavailable';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.pageHeading}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Overview of your account.</Text>
      </View>

      {loading ? <ActivityIndicator style={styles.loading} color={WebsiteTheme.primary} /> : null}
      {profileError ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{profileError}</Text>
          <Pressable onPress={() => void loadProfile()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : null}

      {profile ? <>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.identity}>
              <Text style={styles.name}>{fullName}</Text>
              <View style={styles.roleBadge}><Text style={styles.roleText}>{roleLabel}</Text></View>
            </View>
          </View>

          <View style={styles.details}>
            <Detail label="Email" value={profile.email || 'Email unavailable'} />
            <Detail label="Role" value={roleLabel} />
            {profile.createdAt ? <Detail label="Member since" value={new Date(profile.createdAt).toLocaleDateString()} /> : null}
          </View>

          <View style={styles.buttonRow}>
            <View style={styles.disabledButton}><Text style={styles.disabledButtonText}>Edit profile unavailable</Text></View>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setPasswordFormOpen(true); setPasswordError(''); setPasswordSuccess(''); }}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Change password</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>Profile editing is not supported by the existing API.</Text>
        </View>

        {passwordSuccess ? <View style={styles.successBox}><Text style={styles.successText}>{passwordSuccess}</Text></View> : null}
      </> : !loading && !profileError ? (
        <View style={styles.notice}><Text style={styles.noticeText}>No profile data is available.</Text></View>
      ) : null}
      <Modal visible={passwordFormOpen} transparent animationType="slide" onRequestClose={closePasswordForm}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.passwordCard}>
                <Text style={styles.sectionTitle}>Change password</Text>
                <Text style={styles.sectionSubtitle}>Enter your current password and choose a new one.</Text>
                <PasswordField label="Current password" placeholder="Current password" value={oldPassword} onChangeText={setOldPassword} autoComplete="current-password" returnKeyType="next" />
                <PasswordField label="New password" placeholder="At least 6 characters" value={newPassword} onChangeText={setNewPassword} autoComplete="new-password" returnKeyType="next" />
                <PasswordField label="Confirm new password" placeholder="Re-enter new password" value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" returnKeyType="done" />
                {passwordError ? <View style={styles.errorBox}><Text style={styles.errorText}>{passwordError}</Text></View> : null}
                <View style={styles.modalActions}>
                  <Pressable disabled={saving} onPress={closePasswordForm} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable disabled={saving} onPress={() => void submitPassword()} style={[styles.primaryButton, saving && styles.buttonDisabled]}>
                    {saving ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                    <Text style={styles.primaryButtonText}>{saving ? 'Changing…' : 'Update password'}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  autoComplete,
  placeholder,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder: string;
  returnKeyType: 'next' | 'done';
}) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={autoComplete === 'current-password' ? 'password' : 'newPassword'}
        returnKeyType={returnKeyType}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, paddingBottom: 28, gap: 16 },
  pageHeading: { marginBottom: 2 },
  title: { color: '#111827', fontSize: 24, lineHeight: 31, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 14, lineHeight: 20 },
  loading: { padding: 24 },
  profileCard: { padding: 20, gap: 18, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, backgroundColor: '#ffffff' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: WebsiteTheme.primary },
  avatarText: { color: '#ffffff', fontSize: 23, fontWeight: '800' },
  identity: { flex: 1, minWidth: 0, gap: 8 },
  name: { color: '#111827', fontSize: 21, lineHeight: 28, fontWeight: '700', flexShrink: 1 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#f0fdfa' },
  roleText: { color: WebsiteTheme.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detail: { flexGrow: 1, flexBasis: 220, minWidth: 0, padding: 14, gap: 7, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 13, backgroundColor: '#f9fafb' },
  detailLabel: { color: '#6b7280', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { color: '#111827', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 },
  disabledButton: { paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, opacity: 0.65 },
  disabledButtonText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  secondaryButton: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#ffffff' },
  secondaryButtonText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  helperText: { marginTop: -9, color: '#9ca3af', fontSize: 11, lineHeight: 16 },
  passwordCard: { padding: 20, gap: 13, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, backgroundColor: '#ffffff' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(17, 24, 39, 0.52)' },
  keyboardAvoider: { flex: 1, justifyContent: 'center' },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { marginTop: -8, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: '#374151', fontSize: 13, fontWeight: '600' },
  input: { minHeight: 46, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 11, color: '#111827', backgroundColor: '#ffffff', fontSize: 14 },
  primaryButton: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 11, backgroundColor: WebsiteTheme.primary },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 9, marginTop: 2 },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 11, backgroundColor: '#f3f4f6' },
  cancelText: { color: '#4b5563', fontSize: 13, fontWeight: '700' },
  notice: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#ffffff' },
  noticeText: { color: '#6b7280', fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
  errorBox: { padding: 12, borderRadius: 10, backgroundColor: '#fef2f2' },
  errorText: { color: '#b91c1c', fontSize: 13, lineHeight: 18 },
  successBox: { padding: 13, borderRadius: 10, backgroundColor: '#ecfdf5' },
  successText: { color: '#047857', fontSize: 13, fontWeight: '600' },
});
