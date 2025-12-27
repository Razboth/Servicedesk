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
  Check
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Pengaturan Visibilitas
        </CardTitle>
        <CardDescription>
          Siapa yang dapat melihat artikel ini
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Type Selection */}
        <RadioGroup
          value={visibility}
          onValueChange={(value) => handleVisibilityChange(value as KnowledgeVisibility)}
          disabled={disabled}
          className="space-y-3"
        >
          {VISIBILITY_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={option.value}
                  id={`visibility-${option.value}`}
                  className="mt-1"
                />
                <Label
                  htmlFor={`visibility-${option.value}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {/* Role Selection */}
        {visibility === 'BY_ROLE' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Pilih Role</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllRoles}
                    disabled={disabled}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllRoles}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Hapus Semua
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {ROLES.map((role) => (
                  <div
                    key={role.value}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors min-w-0"
                  >
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={visibleToRoles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                      disabled={disabled}
                      className="flex-shrink-0"
                    />
                    <Label
                      htmlFor={`role-${role.value}`}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <span className="font-medium truncate block">{role.label}</span>
                      <p className="text-xs text-muted-foreground break-words">
                        {role.description}
                      </p>
                    </Label>
                  </div>
                ))}
              </div>
              {visibleToRoles.length === 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Pilih minimal satu role untuk visibilitas ini
                </p>
              )}
            </div>
          </>
        )}

        {/* Branch Selection */}
        {visibility === 'BY_BRANCH' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Pilih Cabang</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllBranches}
                    disabled={disabled || loadingBranches}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllBranches}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Hapus Semua
                  </Button>
                </div>
              </div>

              {/* Search Branch */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari cabang..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="pl-9"
                  disabled={disabled}
                />
              </div>

              {/* Selected Branches Preview */}
              {visibleToBranches.length > 0 && (
                <div className="flex flex-wrap gap-1 max-w-full">
                  {visibleToBranches.map((branchId) => {
                    const branch = branches.find(b => b.id === branchId);
                    return (
                      <Badge
                        key={branchId}
                        variant="secondary"
                        className="flex items-center gap-1 max-w-full"
                      >
                        <span className="truncate max-w-[200px]">{branch?.name || branchId}</span>
                        <button
                          type="button"
                          onClick={() => handleBranchToggle(branchId)}
                          className="ml-1 hover:text-destructive flex-shrink-0"
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Branch List */}
              {loadingBranches ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredBranches.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {branchSearch ? 'Tidak ada cabang yang cocok' : 'Tidak ada cabang tersedia'}
                      </p>
                    ) : (
                      filteredBranches.map((branch) => (
                        <div
                          key={branch.id}
                          className={`flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer min-w-0 ${
                            visibleToBranches.includes(branch.id) ? 'bg-muted' : ''
                          }`}
                          onClick={() => !disabled && handleBranchToggle(branch.id)}
                        >
                          <Checkbox
                            checked={visibleToBranches.includes(branch.id)}
                            onCheckedChange={() => handleBranchToggle(branch.id)}
                            disabled={disabled}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{branch.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({branch.code})
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}

              {visibleToBranches.length === 0 && !loadingBranches && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Pilih minimal satu cabang untuk visibilitas ini
                </p>
              )}
            </div>
          </>
        )}

        {/* Access Summary */}
        <Separator />
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Ringkasan Akses</p>
              <p className="text-sm text-muted-foreground mt-1">
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
