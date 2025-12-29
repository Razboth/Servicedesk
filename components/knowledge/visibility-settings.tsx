'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Users,
  Building2,
  Lock,
  Info,
  Search,
  X,
  CheckCheck
} from 'lucide-react';

// Types
type KnowledgeVisibility = 'EVERYONE' | 'BY_ROLE' | 'BY_BRANCH' | 'PRIVATE';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface VisibilitySettingsProps {
  visibility: KnowledgeVisibility;
  visibleToRoles: string[];
  visibleToBranches: string[];
  onChange: (settings: {
    visibility: KnowledgeVisibility;
    visibleToRoles: string[];
    visibleToBranches: string[];
  }) => void;
  disabled?: boolean;
}

// Role definitions with Indonesian labels
const ROLES = [
  { value: 'USER', label: 'Pengguna', description: 'Pengguna umum sistem' },
  { value: 'TECHNICIAN', label: 'Teknisi', description: 'Staff teknis IT' },
  { value: 'MANAGER', label: 'Manager', description: 'Manajer departemen' },
  { value: 'MANAGER_IT', label: 'Manager IT', description: 'Manajer IT dengan akses shift' },
  { value: 'ADMIN', label: 'Admin', description: 'Administrator sistem' },
  { value: 'SECURITY_ANALYST', label: 'Security Analyst', description: 'Analis keamanan' }
];

// Visibility options with Indonesian labels
const VISIBILITY_OPTIONS = [
  {
    value: 'EVERYONE' as KnowledgeVisibility,
    label: 'Semua Pengguna',
    description: 'Artikel dapat dilihat oleh semua pengguna yang login',
    icon: Globe
  },
  {
    value: 'BY_ROLE' as KnowledgeVisibility,
    label: 'Berdasarkan Role',
    description: 'Hanya pengguna dengan role tertentu yang dapat melihat',
    icon: Users
  },
  {
    value: 'BY_BRANCH' as KnowledgeVisibility,
    label: 'Berdasarkan Cabang',
    description: 'Hanya pengguna dari cabang tertentu yang dapat melihat',
    icon: Building2
  },
  {
    value: 'PRIVATE' as KnowledgeVisibility,
    label: 'Pribadi',
    description: 'Hanya penulis dan kolaborator yang dapat melihat',
    icon: Lock
  }
];

export function VisibilitySettings({
  visibility,
  visibleToRoles,
  visibleToBranches,
  onChange,
  disabled = false
}: VisibilitySettingsProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');

  // Fetch branches for branch selection
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await fetch('/api/branches?limit=500&isActive=true');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || data || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    if (visibility === 'BY_BRANCH') {
      fetchBranches();
    }
  }, [visibility, fetchBranches]);

  // Handle visibility change
  const handleVisibilityChange = (newVisibility: KnowledgeVisibility) => {
    onChange({
      visibility: newVisibility,
      visibleToRoles: newVisibility === 'BY_ROLE' ? visibleToRoles : [],
      visibleToBranches: newVisibility === 'BY_BRANCH' ? visibleToBranches : []
    });
  };

  // Handle role toggle
  const handleRoleToggle = (role: string) => {
    const newRoles = visibleToRoles.includes(role)
      ? visibleToRoles.filter(r => r !== role)
      : [...visibleToRoles, role];

    onChange({
      visibility,
      visibleToRoles: newRoles,
      visibleToBranches
    });
  };

  // Handle branch toggle
  const handleBranchToggle = (branchId: string) => {
    const newBranches = visibleToBranches.includes(branchId)
      ? visibleToBranches.filter(b => b !== branchId)
      : [...visibleToBranches, branchId];

    onChange({
      visibility,
      visibleToRoles,
      visibleToBranches: newBranches
    });
  };

  // Select all roles
  const handleSelectAllRoles = () => {
    onChange({
      visibility,
      visibleToRoles: ROLES.map(r => r.value),
      visibleToBranches
    });
  };

  // Clear all roles
  const handleClearAllRoles = () => {
    onChange({
      visibility,
      visibleToRoles: [],
      visibleToBranches
    });
  };

  // Select all branches
  const handleSelectAllBranches = () => {
    onChange({
      visibility,
      visibleToRoles,
      visibleToBranches: branches.map(b => b.id)
    });
  };

  // Clear all branches
  const handleClearAllBranches = () => {
    onChange({
      visibility,
      visibleToRoles,
      visibleToBranches: []
    });
  };

  // Filter branches by search
  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
    branch.code.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Generate access summary
  const getAccessSummary = () => {
    switch (visibility) {
      case 'EVERYONE':
        return 'Semua pengguna dapat melihat artikel ini';
      case 'BY_ROLE':
        if (visibleToRoles.length === 0) {
          return 'Pilih minimal satu role';
        }
        const roleLabels = visibleToRoles.map(r => ROLES.find(role => role.value === r)?.label || r);
        return `Hanya ${roleLabels.join(', ')} yang dapat melihat`;
      case 'BY_BRANCH':
        if (visibleToBranches.length === 0) {
          return 'Pilih minimal satu cabang';
        }
        const branchNames = visibleToBranches.map(id => branches.find(b => b.id === id)?.name || id);
        if (branchNames.length > 3) {
          return `${branchNames.slice(0, 3).join(', ')} dan ${branchNames.length - 3} cabang lainnya`;
        }
        return `Hanya pengguna dari ${branchNames.join(', ')}`;
      case 'PRIVATE':
        return 'Hanya penulis dan kolaborator yang dapat melihat';
      default:
        return '';
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-primary" />
          Pengaturan Visibilitas
        </CardTitle>
        <CardDescription className="text-sm">
          Tentukan siapa yang dapat melihat artikel ini
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Tipe Visibilitas</Label>
          <RadioGroup
            value={visibility}
            onValueChange={(value) => handleVisibilityChange(value as KnowledgeVisibility)}
            disabled={disabled}
            className="space-y-2"
          >
            {VISIBILITY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = visibility === option.value;
              return (
                <div
                  key={option.value}
                  className={`relative flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`visibility-${option.value}`}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`visibility-${option.value}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Role Selection */}
        {visibility === 'BY_ROLE' && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-foreground">
                  Pilih Role ({visibleToRoles.length} dipilih)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllRoles}
                    disabled={disabled}
                    className="h-8 px-3 text-xs"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllRoles}
                    disabled={disabled}
                    className="h-8 px-3 text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Hapus
                  </Button>
                </div>
              </div>

              {/* Roles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map((role) => {
                  const isChecked = visibleToRoles.includes(role.value);
                  return (
                    <div
                      key={role.value}
                      className={`relative flex items-start space-x-3 p-4 border-2 rounded-lg transition-all cursor-pointer ${
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                      onClick={() => !disabled && handleRoleToggle(role.value)}
                    >
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={isChecked}
                        disabled={disabled}
                        className="mt-0.5 pointer-events-none"
                      />
                      <Label
                        htmlFor={`role-${role.value}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-semibold text-sm mb-1">{role.label}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {role.description}
                        </p>
                      </Label>
                    </div>
                  );
                })}
              </div>

              {visibleToRoles.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Pilih minimal satu role untuk visibilitas ini
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Branch Selection */}
        {visibility === 'BY_BRANCH' && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-foreground">
                  Pilih Cabang ({visibleToBranches.length} dipilih)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllBranches}
                    disabled={disabled || loadingBranches}
                    className="h-8 px-3 text-xs"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllBranches}
                    disabled={disabled}
                    className="h-8 px-3 text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Hapus
                  </Button>
                </div>
              </div>

              {/* Search Branch */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama cabang atau kode..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="pl-9 h-10"
                  disabled={disabled}
                />
              </div>

              {/* Selected Branches Preview */}
              {visibleToBranches.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cabang Terpilih:</Label>
                  <div className="flex flex-wrap gap-2">
                    {visibleToBranches.slice(0, 10).map((branchId) => {
                      const branch = branches.find(b => b.id === branchId);
                      return (
                        <Badge
                          key={branchId}
                          variant="secondary"
                          className="flex items-center gap-1.5 px-2.5 py-1"
                        >
                          <span className="text-xs font-medium">{branch?.code || branchId}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBranchToggle(branchId);
                            }}
                            className="hover:text-destructive transition-colors"
                            disabled={disabled}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {visibleToBranches.length > 10 && (
                      <Badge variant="outline" className="px-2.5 py-1">
                        <span className="text-xs">+{visibleToBranches.length - 10} lainnya</span>
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Branch List */}
              {loadingBranches ? (
                <div className="flex justify-center items-center py-8 border rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Memuat cabang...</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 rounded-lg">
                  <ScrollArea className="h-[280px]">
                    <div className="p-2 space-y-1">
                      {filteredBranches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">
                            {branchSearch ? 'Tidak ada cabang yang cocok' : 'Tidak ada cabang tersedia'}
                          </p>
                          {branchSearch && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Coba kata kunci lain
                            </p>
                          )}
                        </div>
                      ) : (
                        filteredBranches.map((branch) => {
                          const isChecked = visibleToBranches.includes(branch.id);
                          return (
                            <div
                              key={branch.id}
                              className={`flex items-center space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                                isChecked
                                  ? 'bg-primary/10 hover:bg-primary/15'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => !disabled && handleBranchToggle(branch.id)}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={disabled}
                                className="flex-shrink-0 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{branch.name}</span>
                                  <Badge variant="outline" className="px-1.5 py-0 text-xs font-mono">
                                    {branch.code}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {visibleToBranches.length === 0 && !loadingBranches && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Pilih minimal satu cabang untuk visibilitas ini
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Access Summary */}
        <Separator className="my-6" />
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border-2 border-blue-100 dark:border-blue-900">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                Ringkasan Akses
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                {getAccessSummary()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VisibilitySettings;
