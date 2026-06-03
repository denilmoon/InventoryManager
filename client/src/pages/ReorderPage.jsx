import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  const variants = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    ORDERED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md ${variants[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────
// CREATE REORDER DIALOG
// ─────────────────────────────────────────
function CreateReorderDialog({ open, onClose, onSaved, prefillItem }) {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({
    inventoryItemId: '',
    quantityRequested: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/inventory', { params: { limit: 200 } })
      .then((res) => setInventory(res.data.items))
      .catch(() => {});
    setForm({
      inventoryItemId: prefillItem?.id || '',
      quantityRequested: prefillItem
        ? String(prefillItem.stockBaseline - prefillItem.totalStock)
        : '',
      notes: '',
    });
    setError('');
  }, [open, prefillItem]);

  const handleSubmit = async () => {
    if (!form.inventoryItemId) { setError('Please select an item.'); return; }
    if (!form.quantityRequested || parseInt(form.quantityRequested) < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/reorders', {
        inventoryItemId: form.inventoryItemId,
        quantityRequested: parseInt(form.quantityRequested),
        notes: form.notes || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reorder</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Item <span className="text-red-500">*</span></Label>
            <Select
              value={form.inventoryItemId}
              onValueChange={(v) => setForm((p) => ({ ...p, inventoryItemId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item to reorder" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {inventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {item.stockStatus !== 'OK' && ' ⚠️'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qty">Quantity to Order <span className="text-red-500">*</span></Label>
            <Input
              id="qty"
              type="number"
              min="1"
              placeholder="How many to order?"
              value={form.quantityRequested}
              onChange={(e) => setForm((p) => ({ ...p, quantityRequested: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any notes for this reorder (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Reorder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// REORDER PAGE
// ─────────────────────────────────────────
export default function ReorderPage() {
  const { user } = useAuth();
  const [reorders, setReorders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillItem, setPrefillItem] = useState(null);

  const fetchReorders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 50 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const [reorderRes, lowStockRes] = await Promise.all([
        api.get('/reorders', { params }),
        api.get('/inventory/low-stock'),
      ]);
      setReorders(reorderRes.data.reorders);
      setLowStockItems(lowStockRes.data);
      setPagination((prev) => ({
        ...prev,
        total: reorderRes.data.pagination.total,
        pages: reorderRes.data.pagination.pages,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page]);

  useEffect(() => { fetchReorders(); }, [fetchReorders]);

  const handleStatusUpdate = async (reorderId, newStatus) => {
    const confirmed = window.confirm(
      `Are you sure you want to mark this reorder as ${newStatus}?`
    );
    if (!confirmed) return;
    try {
      await api.put(`/reorders/${reorderId}/status`, { status: newStatus });
      fetchReorders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this reorder? This cannot be undone.')) return;
    try {
      await api.delete(`/reorders/${id}`);
      fetchReorders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel reorder.');
    }
  };

  // Items that have low stock but no active reorder
  const unreorderedLowStock = lowStockItems.filter(
    (item) => !reorders.some(
      (r) => r.inventoryItemId === item.id && ['PENDING', 'ORDERED'].includes(r.status)
    )
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reorders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination.total} reorder{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => { setPrefillItem(null); setCreateOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          New Reorder
        </Button>
      </div>

      {/* Low stock suggestions */}
      {unreorderedLowStock.length > 0 && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-sm font-medium text-yellow-800">
                {unreorderedLowStock.length} item{unreorderedLowStock.length !== 1 ? 's' : ''} need{unreorderedLowStock.length === 1 ? 's' : ''} reordering
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {unreorderedLowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">{item.name}</p>
                    <p className="text-xs text-yellow-700">
                      {item.totalStock} in stock · threshold {item.reorderThreshold}
                      · baseline {item.stockBaseline}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    onClick={() => {
                      setPrefillItem(item);
                      setCreateOpen(true);
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reorder
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ORDERED">Ordered</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading reorders...</div>
          ) : reorders.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No reorders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a reorder or convert a low stock alert above
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty Requested</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Shipment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorders.map((reorder) => (
                  <TableRow key={reorder.id}>
                    <TableCell className="font-medium">
                      {reorder.inventoryItem?.name}
                    </TableCell>
                    <TableCell>{reorder.quantityRequested}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reorder.requestedBy?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(reorder.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={reorder.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reorder.shipment
                        ? reorder.shipment.supplier?.name || 'Linked'
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {reorder.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleStatusUpdate(reorder.id, 'ORDERED')}
                          >
                            Mark Ordered
                          </Button>
                        )}
                        {reorder.status === 'ORDERED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleStatusUpdate(reorder.id, 'RECEIVED')}
                          >
                            Mark Received
                          </Button>
                        )}
                        {['PENDING', 'ORDERED'].includes(reorder.status) &&
                          user?.role === 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(reorder.id)}
                            >
                              Cancel
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CreateReorderDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setPrefillItem(null); }}
        onSaved={fetchReorders}
        prefillItem={prefillItem}
      />
    </div>
  );
}