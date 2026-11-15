import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';
import {
  ApiRequestError,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  getUsersForReassignment,
  transferTasksAndDeleteUser,
  updateAdminUser,
  type ManagedUser,
} from '@/services/admin-api';

type RoleFilter = 'all' | 'admin' | 'user';

export function AdminUserManagement() {
  const { accessToken } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const [reassignUsers, setReassignUsers] = useState<Pick<ManagedUser, 'id' | 'name' | 'email'>[]>([]);
  const [selectedReassignId, setSelectedReassignId] = useState<string | number | null>(null);

  const loadUsers = useCallback(async (isRefresh = false, silent = false) => {
    if (!accessToken) {
      setError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await getAdminUsers(accessToken);
      setUsers(response.users ?? []);
      setError('');
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : 'Could not load users.');
    } finally {
      if (!silent) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadUsers(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadUsers]);

  const refreshUsers = useCallback(() => loadUsers(false, true), [loadUsers]);
  useAppAutoRefresh(refreshUsers, 10000, !formOpen && !pendingDelete);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((managedUser) => {
      const matchesSearch = !query || managedUser.name.toLowerCase().includes(query) || managedUser.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || managedUser.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, users]);

  const openCreateForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setFormOpen(true);
  };

  const openEditForm = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setName(managedUser.name);
    setEmail(managedUser.email);
    setPassword('');
    setFormOpen(true);
  };

  const submitUser = async () => {
    if (!accessToken) return;
    if (!name.trim() || !email.trim() || (!editingUser && !password)) {
      Alert.alert('Missing details', editingUser ? 'Enter a name and email.' : 'Enter a name, email, and password.');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await updateAdminUser(accessToken, editingUser.id, { name: name.trim(), email: email.trim() });
      } else {
        await createAdminUser(accessToken, { name: name.trim(), email: email.trim(), password });
      }
      setFormOpen(false);
      await loadUsers(true);
    } catch (submitError) {
      Alert.alert('Could not save user', submitError instanceof Error ? submitError.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (managedUser: ManagedUser) => {
    Alert.alert('Delete user?', `Delete ${managedUser.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void deleteUser(managedUser); } },
    ]);
  };

  const deleteUser = async (managedUser: ManagedUser) => {
    if (!accessToken) return;
    try {
      await deleteAdminUser(accessToken, managedUser.id);
      await loadUsers(true);
    } catch (deleteError) {
      if (deleteError instanceof ApiRequestError && deleteError.status === 409) {
        try {
          const response = await getUsersForReassignment(accessToken, managedUser.id);
          if (response.users.length === 0) {
            Alert.alert('Cannot delete user', 'Reassign or remove their tasks before deleting this user.');
            return;
          }
          setPendingDelete(managedUser);
          setReassignUsers(response.users);
          setSelectedReassignId(response.users[0].id);
        } catch (reassignError) {
          Alert.alert('Could not load assignees', reassignError instanceof Error ? reassignError.message : 'Please try again.');
        }
        return;
      }
      Alert.alert('Could not delete user', deleteError instanceof Error ? deleteError.message : 'Please try again.');
    }
  };

  const confirmReassignment = async () => {
    if (!accessToken || !pendingDelete || selectedReassignId === null) return;
    setSaving(true);
    try {
      await transferTasksAndDeleteUser(accessToken, pendingDelete.id, selectedReassignId);
      setPendingDelete(null);
      setReassignUsers([]);
      await loadUsers(true);
    } catch (transferError) {
      Alert.alert('Could not reassign tasks', transferError instanceof Error ? transferError.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadUsers(true)} tintColor={WebsiteTheme.primary} />}>
        <View style={styles.pageHeading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Manage portal accounts and roles.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openCreateForm} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <View style={styles.countCard}>
          <Text style={styles.count}>{users.length}</Text>
          <Text style={styles.countLabel}>Total accounts</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email"
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Search users by name or email"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        <View style={styles.filters}>
          {(['all', 'admin', 'user'] as const).map((role) => (
            <Pressable key={role} onPress={() => setRoleFilter(role)} style={[styles.filterChip, roleFilter === role && styles.filterChipActive]}>
              <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>
                {role === 'all' ? 'All roles' : role === 'admin' ? 'Admins' : 'Users'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator style={styles.centerState} color={WebsiteTheme.primary} /> : null}
        {!loading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load users</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <Pressable onPress={() => void loadUsers()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {!loading && !error && filteredUsers.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{users.length === 0 ? 'No users yet' : 'No matching users'}</Text>
            <Text style={styles.stateMessage}>{users.length === 0 ? 'Add a user account to get started.' : 'Try another search or role filter.'}</Text>
          </View>
        ) : null}

        {!loading && !error ? filteredUsers.map((managedUser) => (
          <View key={managedUser.id} style={styles.userCard}>
            <View style={styles.userTopRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{managedUser.name.trim().charAt(0).toUpperCase() || '?'}</Text></View>
              <View style={styles.userIdentity}>
                <Text style={styles.userName}>{managedUser.name}</Text>
                <Text style={styles.userEmail}>{managedUser.email}</Text>
              </View>
              <View style={[styles.roleBadge, managedUser.role === 'admin' && styles.adminBadge]}>
                <Text style={[styles.roleText, managedUser.role === 'admin' && styles.adminRoleText]}>{managedUser.role}</Text>
              </View>
            </View>
            <View style={styles.userFooter}>
              <Text style={styles.joinedText}>{managedUser.createdAt ? `Joined ${new Date(managedUser.createdAt).toLocaleDateString()}` : 'Account'}</Text>
              <View style={styles.userActions}>
                <Pressable accessibilityRole="button" onPress={() => openEditForm(managedUser)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Edit</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => confirmDelete(managedUser)} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
              </View>
            </View>
          </View>
        )) : null}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={[styles.modalBackdrop, styles.clearModalBackdrop]}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit user' : 'Add user'}</Text>
              <Text style={styles.modalSubtitle}>{editingUser ? 'Update the account name and email.' : 'New accounts are created with the User role.'}</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#6b7280"
                style={styles.fieldInput}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#6b7280"
                style={styles.fieldInput}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType={editingUser ? 'done' : 'next'}
              />
              {!editingUser ? <>
                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#6b7280"
                  style={styles.fieldInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry
                  returnKeyType="done"
                />
              </> : null}
              <View style={styles.modalActions}>
                <Pressable onPress={() => setFormOpen(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
                <Pressable disabled={saving} onPress={() => void submitUser()} style={[styles.primaryButton, saving && styles.disabledButton]}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : editingUser ? 'Save changes' : 'Create user'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.deleteModalBackdrop}>
          <ScrollView style={styles.deleteModalScroll} contentContainerStyle={styles.deleteModalScrollContent}>
          <View style={[styles.modalCard, styles.deleteModalCard]}>
            <Text style={styles.modalTitle}>Reassign tasks</Text>
            <Text style={styles.modalSubtitle}>{pendingDelete?.name} has tasks assigned. Choose a user to receive those tasks before deletion.</Text>
            <ScrollView style={styles.reassignList}>
              {reassignUsers.map((candidate) => (
                <Pressable key={candidate.id} onPress={() => setSelectedReassignId(candidate.id)} style={[styles.candidate, selectedReassignId === candidate.id && styles.candidateSelected]}>
                  <View style={styles.candidateCopy}>
                    <Text style={styles.candidateName}>{candidate.name}</Text>
                    <Text style={styles.userEmail}>{candidate.email}</Text>
                  </View>
                  <Text style={styles.radioMark}>{selectedReassignId === candidate.id ? '●' : '○'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setPendingDelete(null)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable disabled={saving || selectedReassignId === null} onPress={() => void confirmReassignment()} style={[styles.deleteConfirm, saving && styles.disabledButton]}>
                <Text style={styles.deleteConfirmText}>{saving ? 'Working…' : 'Reassign & delete'}</Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 18, paddingBottom: 26, gap: 14 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: '#111827', fontSize: 23, lineHeight: 30, fontWeight: '700' },
  subtitle: { marginTop: 3, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  primaryButton: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: WebsiteTheme.primary },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  countCard: { flexDirection: 'row', alignItems: 'baseline', gap: 8, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  count: { color: WebsiteTheme.primary, fontSize: 24, fontWeight: '800' },
  countLabel: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  searchInput: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 13, color: '#111827', backgroundColor: '#ffffff', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: WebsiteTheme.primary },
  filterText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  centerState: { paddingVertical: 36 },
  stateCard: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  stateTitle: { color: '#111827', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateMessage: { marginTop: 6, color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 14, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 13, fontWeight: '700' },
  userCard: { padding: 15, gap: 13, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#f0fdfa' },
  avatarText: { color: WebsiteTheme.primary, fontSize: 17, fontWeight: '800' },
  userIdentity: { flex: 1, minWidth: 0, gap: 3 },
  userName: { color: '#111827', fontSize: 15, fontWeight: '700' },
  userEmail: { color: '#6b7280', fontSize: 12 },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 15, backgroundColor: '#f3f4f6' },
  adminBadge: { backgroundColor: '#f0fdfa' },
  roleText: { color: '#4b5563', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  adminRoleText: { color: WebsiteTheme.primary },
  userFooter: { paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  joinedText: { flexShrink: 1, color: '#9ca3af', fontSize: 11 },
  userActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f0fdfa' },
  secondaryButtonText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#fef2f2' },
  deleteButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(17, 24, 39, 0.52)' },
  deleteModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'transparent' },
  clearModalBackdrop: { backgroundColor: 'transparent' },
  deleteModalScroll: { width: '100%', flex: 1 },
  deleteModalScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, borderRadius: 20, backgroundColor: '#ffffff' },
  deleteModalCard: { maxHeight: '100%' },
  modalTitle: { color: '#111827', fontSize: 20, fontWeight: '800' },
  modalSubtitle: { marginTop: 6, marginBottom: 18, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  fieldLabel: { marginBottom: 6, color: '#374151', fontSize: 13, fontWeight: '700' },
  fieldInput: { marginBottom: 15, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 11, color: '#111827', backgroundColor: '#f9fafb', fontSize: 14 },
  modalActions: { marginTop: 7, flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f3f4f6' },
  modalCancelText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  reassignList: { maxHeight: 270, marginBottom: 10 },
  candidate: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 8 },
  candidateSelected: { borderColor: WebsiteTheme.primary, backgroundColor: '#f0fdfa' },
  candidateCopy: { flex: 1, gap: 3 },
  candidateName: { color: '#111827', fontSize: 14, fontWeight: '700' },
  radioMark: { marginLeft: 10, color: WebsiteTheme.primary, fontSize: 18, fontWeight: '700' },
  deleteConfirm: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: '#dc2626' },
  deleteConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
