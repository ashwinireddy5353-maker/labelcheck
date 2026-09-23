import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { profileApi } from '../api/services';
import { 
  User as UserIcon, 
  ShieldAlert, 
  Droplet, 
  X, 
  Plus, 
  Key, 
  Trash2, 
  Save, 
  Mail, 
  ShieldCheck 
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'allergies' | 'security'>('profile');

  // Personal Info Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');

  // Allergies & Sensitivities
  const [allergies, setAllergies] = useState<string[]>(user?.profile?.allergies || []);
  const [newAllergenInput, setNewAllergenInput] = useState('');

  const [skinType, setSkinType] = useState<any>(user?.profile?.skinType || 'sensitive');
  const [skinSensitivities, setSkinSensitivities] = useState<string[]>(user?.profile?.skinSensitivities || []);

  // Avoid List
  const [avoidList, setAvoidList] = useState<string[]>(user?.profile?.avoidIngredients || []);
  const [newAvoidInput, setNewAvoidInput] = useState('');

  // Password Update
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        allergies,
        skinType,
        skinSensitivities,
        avoidIngredients: avoidList,
      });
      showToast('Profile & Allergy preferences updated!', 'success');
    } catch (err) {
      showToast('Failed to save profile changes.', 'error');
    }
  };

  const handleAddAllergen = () => {
    if (newAllergenInput.trim() && !allergies.includes(newAllergenInput.trim())) {
      setAllergies([...allergies, newAllergenInput.trim()]);
      setNewAllergenInput('');
    }
  };

  const handleAddAvoid = () => {
    if (newAvoidInput.trim() && !avoidList.includes(newAvoidInput.trim())) {
      setAvoidList([...avoidList, newAvoidInput.trim()]);
      setNewAvoidInput('');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    setIsUpdatingPassword(true);
    try {
      await profileApi.updatePassword({ oldPassword, newPassword });
      showToast('Password updated successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
    } catch {
      showToast('Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await profileApi.deleteAccount();
      await logout();
      showToast('Account deleted.', 'info');
    } catch {
      showToast('Failed to delete account.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt={user?.fullName || 'User Avatar'}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-600 shadow-md"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{user?.fullName}</h1>
            <p className="text-xs text-slate-500">{user?.email} • Role: {user?.role.toUpperCase()}</p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSaveProfile}
          leftIcon={<Save className="w-4 h-4" />}
          className="shadow-md"
        >
          Save All Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'profile', label: 'Personal Information', icon: UserIcon },
          { id: 'allergies', label: 'Allergies & Sensitivities', icon: ShieldAlert },
          { id: 'security', label: 'Security & Account', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-teal-700 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Personal Info */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<UserIcon className="w-4 h-4" />}
            />

            <Input
              label="Email Address (Read-only)"
              value={email}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              className="bg-slate-100 cursor-not-allowed"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="primary" onClick={handleSaveProfile} leftIcon={<Save className="w-4 h-4" />}>
              Save Personal Info
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: Allergies & Sensitivities */}
      {activeTab === 'allergies' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-8 shadow-sm">
          {/* Allergies Watch Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Saved Allergies Watchlist
                </h3>
                <p className="text-xs text-slate-500">Products containing these ingredients will trigger high-risk warnings.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {allergies.map((alg) => (
                <span
                  key={alg}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200"
                >
                  <span>{alg}</span>
                  <button
                    onClick={() => setAllergies(allergies.filter((a) => a !== alg))}
                    className="text-red-500 hover:text-red-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add ingredient or allergen name..."
                value={newAllergenInput}
                onChange={(e) => setNewAllergenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergen())}
              />
              <Button variant="outline" onClick={handleAddAllergen} leftIcon={<Plus className="w-4 h-4" />}>
                Add
              </Button>
            </div>
          </div>

          {/* Skin Type & Sensitivities */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-teal-600" />
              Skin Barrier & Sensitivity Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['sensitive', 'dry', 'oily', 'combination', 'normal'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSkinType(st as any)}
                  className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                    skinType === st
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st} Skin
                </button>
              ))}
            </div>
          </div>

          {/* Avoid List */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <X className="w-5 h-5 text-amber-600" />
              Ingredients to Avoid
            </h3>

            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {avoidList.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300"
                >
                  <span>{item}</span>
                  <button onClick={() => setAvoidList(avoidList.filter((a) => a !== item))}>
                    <X className="w-3.5 h-3.5 text-amber-700" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add ingredient to avoid..."
                value={newAvoidInput}
                onChange={(e) => setNewAvoidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAvoid())}
              />
              <Button variant="outline" onClick={handleAddAvoid} leftIcon={<Plus className="w-4 h-4" />}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="primary" onClick={handleSaveProfile} leftIcon={<Save className="w-4 h-4" />}>
              Save Allergy & Sensitivity Settings
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: Security & Delete Account */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-8 shadow-sm">
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <h3 className="text-lg font-bold text-slate-900">Update Password</h3>

            <Input
              label="Current Password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" isLoading={isUpdatingPassword} leftIcon={<Key className="w-4 h-4" />}>
              Update Password
            </Button>
          </form>

          {/* Delete Account Danger Zone */}
          <div className="pt-8 border-t border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-red-900">Danger Zone</h3>
            <p className="text-xs text-slate-500">
              Permanently remove your profile preferences and saved scan history from LabelCheck.
            </p>

            <Button
              variant="danger"
              onClick={() => setIsDeleteOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete My Account
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Permanently Delete Account?"
        message="This action cannot be undone. All saved allergy preferences, product reports, and scan history will be deleted."
        confirmText="Delete Account"
        variant="danger"
        isLoading={isDeletingAccount}
      />
    </div>
  );
};
