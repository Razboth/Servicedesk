'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  History,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Printer,
  CreditCard,
  HardDrive,
  DoorOpen,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface CurrentAlarm {
  id: string;
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  timeAgo: string | null;
  createdAt: string;
}

interface AtmDevice {
  id: string;
  deviceId: string;
  location: string | null;
  status: 'ONLINE' | 'ALARM';
  lastSeenAt: string;
  currentAlarms: CurrentAlarm[];
}

interface AlarmTypeBreakdown {
  alarmType: string;
  count: number;
}

interface Summary {
  totalDevices: number;
  alarmingDevices: number;
  onlineDevices: number;
  alarmTypeBreakdown: AlarmTypeBreakdown[];
}

interface LastUpdate {
  id: string;
  timestamp: string;
  receivedAt: string;
  alarmCount: number;
  processedCount: number;
  devicesAlarming: number;
  devicesCleared: number;
}

interface HistoryRecord {
  id: string;
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  clearedAt: string | null;
  duration: number | null;
}

// Map alarm types to icons
const getAlarmIcon = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) {
    return <WifiOff className="h-4 w-4" />;
  }
  if (type.includes('printer') || type.includes('receipt')) {
    return <Printer className="h-4 w-4" />;
  }
  if (type.includes('cash') || type.includes('cassette')) {
    return <HardDrive className="h-4 w-4" />;
  }
  if (type.includes('mcrw') || type.includes('card')) {
    return <CreditCard className="h-4 w-4" />;
  }
  if (type.includes('door')) {
    return <DoorOpen className="h-4 w-4" />;
  }
  return <AlertCircle className="h-4 w-4" />;
};

// Map alarm types to colors
const getAlarmColor = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (type.includes('error')) {
    return 'bg-orange-100 text-orange-700 border-orange-200';
  }
  if (type.includes('warning') || type.includes('low')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export default function AtmAlarmsPage() {
  const [devices, setDevices] = useState<AtmDevice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alarmTypeFilter, setAlarmTypeFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<AtmDevice | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<HistoryRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchDevices = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(alarmTypeFilter !== 'all' && { alarmType: alarmTypeFilter }),
      });

      const response = await fetch(`/api/monitoring/atm?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ATM data');

      const data = await response.json();
      setDevices(data.data.devices);
      setSummary(data.data.summary);
      setLastUpdate(data.data.lastUpdate);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Error fetching ATM data:', error);
      if (!silent) {
        toast.error('Gagal memuat data ATM');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, alarmTypeFilter]);

  const fetchDeviceHistory = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/monitoring/atm/${deviceId}`);
      if (!response.ok) throw new Error('Failed to fetch device history');
      const data = await response.json();
      setDeviceHistory(data.data.recentHistory);
    } catch (error) {
      console.error('Error fetching device history:', error);
      toast.error('Gagal memuat riwayat perangkat');
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDevices(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDevices]);

  const handleManualRefresh = () => {
    fetchDevices(true);
    toast.success('Data diperbarui');
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleDeviceClick = async (device: AtmDevice) => {
    setSelectedDevice(device);
    setModalOpen(true);
    await fetchDeviceHistory(device.deviceId);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}h ${hours % 24}j ${minutes}m`;
    }
    return `${hours}j ${minutes}m`;
  };

  // Get unique alarm types for filter
  const alarmTypes = summary?.alarmTypeBreakdown.map((a) => a.alarmType) || [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            ATM Alarm Monitor
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time ATM alarm monitoring dari sistem eksternal
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Auto-refresh</span>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
          <Button onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{summary?.totalDevices || 0}</div>
            <p className="text-xs text-gray-500">Total Perangkat</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700">
                {summary?.onlineDevices || 0}
              </span>
            </div>
            <p className="text-xs text-green-600">Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700">
                {summary?.alarmingDevices || 0}
              </span>
            </div>
            <p className="text-xs text-red-600">Alarm Aktif</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {lastUpdate ? formatTime(lastUpdate.receivedAt) : '-'}
              </span>
            </div>
            <p className="text-xs text-blue-600">Update Terakhir</p>
          </CardContent>
        </Card>
      </div>

      {/* Alarm Type Breakdown */}
      {summary && summary.alarmTypeBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tipe Alarm Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.alarmTypeBreakdown.map((item) => (
                <Badge
                  key={item.alarmType}
                  className={`${getAlarmColor(item.alarmType)} flex items-center gap-1 cursor-pointer`}
                  onClick={() => setAlarmTypeFilter(item.alarmType)}
                >
                  {getAlarmIcon(item.alarmType)}
                  <span>{item.alarmType}</span>
                  <span className="ml-1 px-1.5 py-0.5 bg-white/50 rounded text-xs font-bold">
                    {item.count}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari device ID atau lokasi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ALARM">Alarm</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alarmTypeFilter} onValueChange={setAlarmTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipe Alarm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {alarmTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Memuat data ATM...</span>
        </div>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="p-16">
            <div className="flex flex-col items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-green-700">Semua ATM Normal</h3>
              <p className="text-gray-500 mt-2">
                Tidak ada alarm aktif. Semua sistem beroperasi normal.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ATM Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {devices.map((device) => {
              const isAlarming = device.status === 'ALARM';

              return (
                <Card
                  key={device.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 ${
                    isAlarming
                      ? 'border-red-200 bg-red-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                  onClick={() => handleDeviceClick(device)}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {device.deviceId}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{device.location || '-'}</span>
                        </div>
                      </div>
                      <Badge
                        className={
                          isAlarming
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-green-100 text-green-700 border-green-200'
                        }
                      >
                        {isAlarming ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            ALARM
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            ONLINE
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Active Alarms */}
                    {device.currentAlarms.length > 0 && (
                      <div className="space-y-2">
                        {device.currentAlarms.slice(0, 3).map((alarm) => (
                          <div
                            key={alarm.id}
                            className={`flex items-center gap-2 p-2 rounded ${getAlarmColor(
                              alarm.alarmType
                            )}`}
                          >
                            {getAlarmIcon(alarm.alarmType)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {alarm.alarmType}
                              </p>
                              <p className="text-[10px] opacity-75">
                                {alarm.timeAgo || formatTime(alarm.occurredAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {device.currentAlarms.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{device.currentAlarms.length - 3} alarm lainnya
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Menampilkan {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)} dari{' '}
                    {pagination.totalCount} perangkat
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDevice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{selectedDevice.deviceId}</div>
                    <div className="text-sm font-normal text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedDevice.location || '-'}
                    </div>
                  </div>
                  <Badge
                    className={
                      selectedDevice.status === 'ALARM'
                        ? 'bg-red-100 text-red-700 border-red-200 text-base px-4 py-2'
                        : 'bg-green-100 text-green-700 border-green-200 text-base px-4 py-2'
                    }
                  >
                    {selectedDevice.status === 'ALARM' ? (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        ALARM
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        ONLINE
                      </>
                    )}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Detail perangkat dan riwayat alarm
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="alarms" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="alarms" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alarm Aktif ({selectedDevice.currentAlarms.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Riwayat
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="alarms" className="mt-4">
                  {selectedDevice.currentAlarms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                      <p className="text-gray-500">Tidak ada alarm aktif</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDevice.currentAlarms.map((alarm) => (
                        <div
                          key={alarm.id}
                          className={`p-4 rounded-lg border-2 ${getAlarmColor(
                            alarm.alarmType
                          )}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/50 rounded">
                              {getAlarmIcon(alarm.alarmType)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{alarm.alarmType}</p>
                              <p className="text-sm opacity-75">
                                Lokasi: {alarm.location}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(alarm.occurredAt)}
                                </span>
                                {alarm.timeAgo && (
                                  <span className="opacity-75">{alarm.timeAgo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  {deviceHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <History className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-500">Tidak ada riwayat alarm</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe Alarm</TableHead>
                          <TableHead>Waktu Mulai</TableHead>
                          <TableHead>Waktu Selesai</TableHead>
                          <TableHead>Durasi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deviceHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getAlarmIcon(record.alarmType)}
                                <span className="text-sm">{record.alarmType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatTime(record.occurredAt)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.clearedAt ? (
                                <span className="text-green-600">
                                  {formatTime(record.clearedAt)}
                                </span>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Aktif</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDuration(record.duration)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t text-xs text-gray-500 mt-4">
                <span>Terakhir dilihat: {formatTime(selectedDevice.lastSeenAt)}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
