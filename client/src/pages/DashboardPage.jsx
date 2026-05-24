import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  AlertTriangle,
  XCircle,
  Star,
  Truck,
  RefreshCw,
  Clock,
} from 'lucide-react';

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({ title, value, icon: Icon, description, variant }) {
  const colors = {
    default: 'text-gray-600',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    blue: 'text-blue-500',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`h-4 w-4 ${colors[variant] || colors.default}`} />
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// STOCK STATUS BADGE
// ─────────────────────────────────────────
function StockBadge({ status }) {
  if (status === 'OUT') return <Badge variant="destructive">OUT</Badge>;
  if (status === 'LOW') return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">LOW</Badge>;
  return <Badge variant="secondary">OK</Badge>;
}

// ─────────────────────────────────────────
// ACTION LABEL
// ─────────────────────────────────────────
function actionLabel(action) {
  const labels = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Logged in',
    RECEIVE: 'Received shipment',
    DISPATCH: 'Dispatched',
    ADJUST: 'Adjusted stock',
    IMPORT: 'Imported data',
    REPORT_GENERATED: 'Generated report',
  };
  return labels[action] || action;
}

// ─────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const { stats, lowStockItems, pendingShipments, openReorders, recentActivity } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live overview of inventory status and recent activity
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          icon={Package}
          description="Distinct item types"
          variant="default"
        />
        <StatCard
          title="Tier 1 Items"
          value={stats.tier1Items}
          icon={Star}
          description="Revenue items"
          variant="blue"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          description="Below reorder threshold"
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={stats.outOfStockCount}
          icon={XCircle}
          description="Zero quantity"
          variant="danger"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All items are sufficiently stocked.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.totalStock} in stock · threshold {item.reorderThreshold}
                      </p>
                    </div>
                    <StockBadge status={item.stockStatus} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {actionLabel(log.action)}{' '}
                        <span className="font-normal text-muted-foreground">
                          {log.entityType}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.name} ·{' '}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending shipments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-500" />
              Pending Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingShipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending shipments.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {shipment.supplier?.name || 'Unknown supplier'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shipment.lineItems.length} item type
                        {shipment.lineItems.length !== 1 ? 's' : ''} ·{' '}
                        {shipment.estimatedArrival
                          ? `ETA ${new Date(shipment.estimatedArrival).toLocaleDateString()}`
                          : 'No ETA set'}
                      </p>
                    </div>
                    <Badge variant="secondary">{shipment.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open reorders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              Open Reorders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openReorders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open reorders.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {openReorders.map((reorder) => (
                  <div key={reorder.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {reorder.inventoryItem?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty {reorder.quantityRequested} · by {reorder.requestedBy?.name}
                      </p>
                    </div>
                    <Badge variant="secondary">{reorder.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}