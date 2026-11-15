import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WebsiteTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/services/auth-api';

type FormErrors = { email?: string; password?: string };

const demoCredentials = [
  {
    role: 'Admin',
    email: 'testadmin@gmail.com',
    password: 'TestAdmin@123',
    description: 'Manage users, tasks, and workspace settings.',
  },
  {
    role: 'User',
    email: 'testuser1@gmail.com',
    password: 'Tuuu10',
    description: 'View assigned tasks and update progress.',
  },
] as const;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastTitle, setToastTitle] = useState('Sign-in failed');
  const [hideStartupError, setHideStartupError] = useState(false);
  const [signingInRole, setSigningInRole] = useState<'admin' | 'user' | null>(null);
  const passwordInput = useRef<React.ElementRef<typeof TextInput>>(null);
  const submissionInProgress = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, logout, isLoading, startupError } = useAuth();

  const clearLoginFeedback = () => {
    setInlineError('');
    setNotice('');
    setHideStartupError(true);
    setToastMessage('');
    setToastTitle('Sign-in failed');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
  };

  const signInWithDemo = (account: (typeof demoCredentials)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
    setShowPassword(false);
    clearLoginFeedback();
    void handleLogin(account, account.role === 'Admin' ? 'admin' : 'user');
  };

  const showLoginFailure = (error: unknown) => {
    const feedback = getFriendlyLoginError(error);
    setInlineError(feedback.message);
    setToastTitle(feedback.title);
    setToastMessage(feedback.message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMessage('');
      toastTimer.current = null;
    }, 4_500);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const handleLogin = async (credentials?: { email: string; password: string }, expectedRole?: 'admin' | 'user') => {
    if (submissionInProgress.current || isLoading) return;
    clearLoginFeedback();

    const nextErrors: FormErrors = {};
    const trimmedEmail = (credentials?.email ?? email).trim();
    const submittedPassword = credentials?.password ?? password;

    if (!trimmedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!submittedPassword.trim()) {
      nextErrors.password = 'Please enter your password.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submissionInProgress.current = true;
    setSigningInRole(expectedRole ?? null);
    try {
      const authenticatedUser = await login(trimmedEmail, submittedPassword);
      if (expectedRole && authenticatedUser.role !== expectedRole) {
        await logout();
        throw new ApiError(
          `This demo account is configured as ${authenticatedUser.role}, not ${expectedRole}. Please check the demo account setup.`,
          403,
        );
      }
      router.replace('/(authenticated)');
    } catch (error) {
      showLoginFailure(error);
    } finally {
      submissionInProgress.current = false;
      setSigningInRole(null);
    }
  };

  const showPlaceholderNotice = (label: string) => {
    setNotice(`${label} will be available soon.`);
  };

  return (
    <View style={styles.background}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {toastMessage ? (
          <View pointerEvents="box-none" style={styles.toastPosition}>
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLabel={`${toastTitle}. ${toastMessage}`}
              accessibilityLiveRegion="assertive"
              style={styles.toast}>
              <View style={styles.toastIcon}>
                <Text style={styles.toastIconText}>!</Text>
              </View>
              <View style={styles.toastCopy}>
                <Text style={styles.toastTitle}>{toastTitle}</Text>
                <Text style={styles.toastBody}>{toastMessage}</Text>
              </View>
            </View>
          </View>
        ) : null}
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.card}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>TM</Text>
              </View>
              <Text style={styles.heading}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to manage your tasks</Text>

              <View style={styles.form}>
                <View>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={(value) => {
                      setEmail(value);
                      clearLoginFeedback();
                      if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                    }}
                    onSubmitEditing={() => passwordInput.current?.focus()}
                    placeholder="Enter your email"
                    placeholderTextColor={WebsiteTheme.mutedText}
                    returnKeyType="next"
                    style={[styles.input, errors.email ? styles.inputError : undefined]}
                    textContentType="emailAddress"
                    value={email}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                <View>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.passwordField, errors.password ? styles.inputError : undefined]}>
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      onChangeText={(value) => {
                        setPassword(value);
                        clearLoginFeedback();
                        if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                      }}
                      onSubmitEditing={() => { void handleLogin(); }}
                      placeholder="Enter your password"
                      placeholderTextColor={WebsiteTheme.mutedText}
                      returnKeyType="done"
                      secureTextEntry={!showPassword}
                      style={styles.passwordInput}
                      textContentType="password"
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      hitSlop={10}
                      onPress={() => setShowPassword((visible) => !visible)}
                      style={styles.visibilityButton}>
                      <Text style={styles.visibilityText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => showPlaceholderNotice('Password recovery')}
                  style={styles.forgotButton}>
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void handleLogin(); }}
                  disabled={isLoading}
                  style={({ pressed }) => [styles.loginButton, pressed && !isLoading && styles.loginButtonPressed, isLoading && styles.loginButtonDisabled]}>
                  {isLoading ? <ActivityIndicator color={WebsiteTheme.buttonText} /> : <Text style={styles.loginButtonText}>Login</Text>}
                </Pressable>

                {inlineError ? (
                  <View style={styles.inlineErrorBox}>
                    <Text style={styles.inlineErrorText}>{inlineError}</Text>
                  </View>
                ) : null}
                {!inlineError && notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
                {!inlineError && !notice && startupError && !hideStartupError ? (
                  <View style={styles.inlineErrorBox}>
                    <Text style={styles.inlineErrorText}>We could not confirm your saved session. Please sign in again.</Text>
                  </View>
                ) : null}

                <View style={styles.createAccountRow}>
                  <Text style={styles.createAccountText}>New here? </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => showPlaceholderNotice('Account creation')}>
                    <Text style={styles.linkText}>Create Account</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.demoSection}>
                <Text style={styles.demoEyebrow}>DEMO ACCESS</Text>
                <Text style={styles.demoHeading}>Explore the workspace</Text>
                <Text style={styles.demoSubtitle}>Choose a role to view or fill its demo login details.</Text>

                {demoCredentials.map((account) => {
                  const isAdmin = account.role === 'Admin';
                  return (
                    <View key={account.role} style={[styles.demoCard, isAdmin ? styles.adminDemoCard : styles.userDemoCard]}>
                      <View style={styles.demoCardHeader}>
                        <View style={[styles.demoRoleMark, isAdmin ? styles.adminRoleMark : styles.userRoleMark]}>
                          <Text style={[styles.demoRoleInitial, isAdmin ? styles.adminRoleText : styles.userRoleText]}>{isAdmin ? 'A' : 'U'}</Text>
                        </View>
                        <View style={styles.demoRoleCopy}>
                          <View style={styles.demoTitleRow}>
                            <Text style={styles.demoRole}>{account.role} workspace</Text>
                            <Text style={[styles.demoBadge, isAdmin ? styles.adminDemoBadge : styles.userDemoBadge]}>DEMO</Text>
                          </View>
                          <Text style={styles.demoDescription}>{account.description}</Text>
                        </View>
                      </View>

                      <View style={styles.demoCredentials}>
                        <View style={styles.demoCredentialRow}>
                          <Text style={styles.demoCredentialLabel}>Email</Text>
                          <Text selectable style={styles.demoCredentialValue}>{account.email}</Text>
                        </View>
                        <View style={styles.demoCredentialRow}>
                          <Text style={styles.demoCredentialLabel}>Password</Text>
                          <Text selectable style={styles.demoCredentialValue}>{account.password}</Text>
                        </View>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Fill ${account.role} demo credentials`}
                        disabled={isLoading}
                        onPress={() => signInWithDemo(account)}
                        style={({ pressed }) => [styles.demoUseButton, isAdmin ? styles.adminDemoButton : styles.userDemoButton, pressed && styles.demoUseButtonPressed]}>
                        <Text style={styles.demoUseButtonText}>{signingInRole === (isAdmin ? 'admin' : 'user') ? 'Signing in…' : `Sign in as ${account.role}`}</Text>
                        <Text style={styles.demoUseButtonArrow}>›</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function getFriendlyLoginError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError && error.status === 429) {
    const waitMessage = error.retryAfterSeconds === null
      ? "You've tried logging in too many times. Please wait a while before trying again."
      : `You've tried logging in too many times. Please wait about ${formatWaitDuration(error.retryAfterSeconds)} before trying again.`;
    return { title: 'Too many login attempts', message: waitMessage };
  }

  if (!(error instanceof ApiError)) {
    return { title: 'Sign-in failed', message: 'We could not sign you in. Please try again.' };
  }

  if (error.status === 401 || error.status === 404) {
    return { title: 'Sign-in failed', message: 'The email or password is incorrect. Check your details and try again.' };
  }
  if (error.status === 403) {
    return { title: 'Demo role mismatch', message: error.message };
  }
  if (error.status !== null && error.status >= 500) {
    return { title: 'Sign-in failed', message: 'Sign-in is temporarily unavailable. Please try again shortly.' };
  }
  if (error.status === null && /timed out/i.test(error.message)) {
    return { title: 'Sign-in failed', message: 'The sign-in request took too long. Check your connection and try again.' };
  }
  if (error.status === null) {
    return { title: 'Sign-in failed', message: 'We could not reach the sign-in service. Check your connection and try again.' };
  }
  return { title: 'Sign-in failed', message: 'We could not complete sign-in. Check your details and try again.' };
}

function formatWaitDuration(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#f5f7fb' },
  safeArea: { flex: 1, position: 'relative' },
  keyboardArea: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  brandMark: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: WebsiteTheme.primary,
    shadowColor: WebsiteTheme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  brandMarkText: { color: WebsiteTheme.buttonText, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  heading: { color: '#111827', fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  form: { gap: 18, marginTop: 30 },
  label: { marginBottom: 8, color: '#374151', fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 16,
  },
  passwordField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  passwordInput: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 11, color: '#111827', fontSize: 16 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 10 },
  visibilityText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  inputError: { borderColor: '#ef4444' },
  errorText: { marginTop: 6, color: '#dc2626', fontSize: 13, lineHeight: 18 },
  forgotButton: { alignSelf: 'flex-end', marginTop: -6 },
  linkText: { color: WebsiteTheme.primary, fontSize: 14, fontWeight: '600' },
  loginButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderRadius: 12,
    backgroundColor: WebsiteTheme.primary,
  },
  loginButtonPressed: { backgroundColor: WebsiteTheme.primaryPressed, opacity: 0.92 },
  loginButtonDisabled: { opacity: 0.72 },
  loginButtonText: { color: WebsiteTheme.buttonText, fontSize: 16, fontWeight: '600' },
  notice: { marginTop: -7, color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  inlineErrorBox: { marginTop: -6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  inlineErrorText: { color: '#b91c1c', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  toastPosition: { position: 'absolute', top: 8, left: 16, right: 16, zIndex: 10, elevation: 10 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, backgroundColor: '#ffffff', shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  toastIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#fef2f2' },
  toastIconText: { color: '#b91c1c', fontSize: 17, fontWeight: '700' },
  toastCopy: { flex: 1, gap: 2 },
  toastTitle: { color: '#7f1d1d', fontSize: 14, fontWeight: '700' },
  toastBody: { color: '#4b5563', fontSize: 13, lineHeight: 18 },
  demoSection: { marginTop: 26, paddingTop: 21, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  demoEyebrow: { color: WebsiteTheme.primary, fontSize: 11, letterSpacing: 1.5, fontWeight: '800' },
  demoHeading: { marginTop: 5, color: '#111827', fontSize: 19, lineHeight: 25, fontWeight: '800' },
  demoSubtitle: { marginTop: 4, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  demoCard: { marginTop: 13, padding: 14, borderWidth: 1, borderRadius: 15 },
  adminDemoCard: { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  userDemoCard: { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  demoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  demoRoleMark: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  adminRoleMark: { backgroundColor: '#ccfbf1' },
  userRoleMark: { backgroundColor: '#f0fdfa' },
  demoRoleInitial: { fontSize: 17, fontWeight: '800' },
  adminRoleText: { color: '#115e59' },
  userRoleText: { color: '#0f766e' },
  demoRoleCopy: { flex: 1, minWidth: 0 },
  demoTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  demoRole: { color: '#111827', fontSize: 14, fontWeight: '800' },
  demoBadge: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, fontSize: 9, letterSpacing: 0.6, fontWeight: '800' },
  adminDemoBadge: { color: '#115e59', backgroundColor: '#ccfbf1' },
  userDemoBadge: { color: '#0f766e', backgroundColor: '#f0fdfa' },
  demoDescription: { marginTop: 3, color: '#6b7280', fontSize: 12, lineHeight: 17 },
  demoCredentials: { gap: 9, marginTop: 13, padding: 11, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 11, backgroundColor: '#ffffff' },
  demoCredentialRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  demoCredentialLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  demoCredentialValue: { flex: 1, color: '#1f2937', fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'right' },
  demoUseButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 11, paddingHorizontal: 12, borderRadius: 11 },
  adminDemoButton: { backgroundColor: '#0f766e' },
  userDemoButton: { backgroundColor: WebsiteTheme.primary },
  demoUseButtonPressed: { opacity: 0.82 },
  demoUseButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  demoUseButtonArrow: { color: '#ffffff', fontSize: 20, lineHeight: 22, fontWeight: '600' },
  createAccountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  createAccountText: { color: '#6b7280', fontSize: 14 },
});
