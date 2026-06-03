import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Search,
  Truck,
  PackageCheck,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  const variants = {
    PENDING: 'bg-gray-100 text-gray-700',
    ORDERED: 'bg-blue-100 text-blue-700',
    IN_TRANSIT: 'bg-yellow-100 text-yellow-700',
    RECEIVED: 'bg-green-100 text-green-700',
    ISSUE: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md ${variants[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─────────────────────────────────────────
// CREATE SHIPMENT DIALOG
// ─────────────────────────────────────────
function CreateShipmentDialog({ open, onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    supplierId: '',
    shipperId: '',
    estimatedArrival: '',
    destinationLocationId: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([{ inventoryItemId: '', expectedQty: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      try {
        const [s, sh, inv, loc] = await Promise.all([
          api.get('/suppliers'),
          api.get('/shippers'),
          api.get('/inventory', { params: { limit: 200 } }),
          api.get('/locations/flat'),
        ]);
        setSuppliers(s.data);
        setShippers(sh.data);
        setInventory(inv.data.items);
        setLocations(loc.data);
      } catch {
        // fail silently
      }
    };
    fetch();
    setForm({ supplierId: '', shipperId: '', estimatedArrival: '', destinationLocationId: '', notes: '' });
    setLineItems([{ inventoryItemId: '', expectedQty: '' }]);
    setError('');
  }, [open]);

  const addLineItem = () =>
    setLineItems((prev) => [...prev, { inventoryItemId: '', expectedQty: '' }]);

  const removeLineItem = (index) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const updateLineItem = (index, field, value) =>
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, [field]: value } : li))
    );

  const handleSubmit = async () => {
    if (!form.supplierId) { setError('Supplier is required.'); return; }
    if (lineItems.some((li) => !li.inventoryItemId || !li.expectedQty)) {
      setError('All line items must have an item and quantity.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/shipments', {
        ...form,
        supplierId: form.supplierId,
        shipperId: form.shipperId || null,
        destinationLocationId: form.destinationLocationId || null,
        estimatedArrival: form.estimatedArrival || null,
        lineItems: lineItems.map((li) => ({
          inventoryItemId: li.inventoryItemId,
          expectedQty: parseInt(li.expectedQty),
        })),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shipment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">

            
            {/* Supplier */}
            <div className="flex flex-col gap-1.5">
              <Label>Supplier <span className="text-red-500">*</span></Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm((p) => ({ ...p, supplierId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          {/* Shipper */}
            <div className="flex flex-col gap-1.5">
              <Label>Shipper</Label>
              <Select value={form.shipperId} onValueChange={(v) => setForm((p) => ({ ...p, shipperId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipper (optional)" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="none">No shipper</SelectItem>
                  {shippers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Arrival */}
            <div className="flex flex-col gap-1.5">
              <Label>Estimated Arrival</Label>
              <Input
                type="date"
                value={form.estimatedArrival}
                onChange={(e) => setForm((p) => ({ ...p, estimatedArrival: e.target.value }))}
              />
            </div>

            {/* Destination */}
            <div className="flex flex-col gap-1.5">
              <Label>Destination Location</Label>
              <Select value={form.destinationLocationId} onValueChange={(v) => setForm((p) => ({ ...p, destinationLocationId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Where will this be stored?" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="none">Not specified</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          

          <Separator />

          {/* Line items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1">
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
            {lineItems.map((li, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={li.inventoryItemId}
                  onValueChange={(v) => updateLineItem(index, 'inventoryItemId', v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="w-20"
                  value={li.expectedQty}
                  onChange={(e) => updateLineItem(index, 'expectedQty', e.target.value)}
                />
                {lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeLineItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Shipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// RECEIVE SHIPMENT DIALOG
// ─────────────────────────────────────────
function ReceiveShipmentDialog({ open, onClose, onSaved, shipment }) {
  const [locations, setLocations] = useState([]);
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !shipment) return;
    api.get('/locations/flat').then((res) => setLocations(res.data)).catch(() => {});
    setDestinationLocationId(shipment.destinationLocationId || '');
    setLineItems(
      shipment.lineItems.map((li) => ({
        id: li.id,
        inventoryItemId: li.inventoryItemId,
        itemName: li.inventoryItem.name,
        expectedQty: li.expectedQty,
        receivedQty: String(li.expectedQty),
      }))
    );
    setError('');
  }, [open, shipment]);

  const handleSubmit = async () => {
    if (!destinationLocationId) { setError('Destination location is required.'); return; }
    if (lineItems.some((li) => li.receivedQty === '' || parseInt(li.receivedQty) < 0)) {
      setError('All items need a valid received quantity.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/shipments/${shipment.id}/receive`, {
        destinationLocationId,
        lineItems: lineItems.map((li) => ({
          id: li.id,
          inventoryItemId: li.inventoryItemId,
          receivedQty: parseInt(li.receivedQty),
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Shipment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Storage Location <span className="text-red-500">*</span></Label>
            <Select value={destinationLocationId} onValueChange={setDestinationLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Where is this being stored?" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label>Confirm Received Quantities</Label>
            {lineItems.map((li, index) => (
              <div key={li.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{li.itemName}</p>
                  <p className="text-xs text-muted-foreground">Expected: {li.expectedQty}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  className="w-24"
                  value={li.receivedQty}
                  onChange={(e) =>
                    setLineItems((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, receivedQty: e.target.value } : item
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            <PackageCheck className="h-4 w-4" />
            {loading ? 'Receiving...' : 'Confirm Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// SHIPMENT PAGE
// ─────────────────────────────────────────
export default function ShipmentPage() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/shipments', { params });
      setShipments(res.data.shipments);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        pages: res.data.pagination.pages,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handleStatusUpdate = async (shipment, newStatus) => {
    const labels = {
      ORDERED: 'mark this shipment as Ordered',
      IN_TRANSIT: 'mark this shipment as In Transit',
      ISSUE: 'flag this shipment as an Issue',
    };
    const confirmed = window.confirm(
      `Are you sure you want to ${labels[newStatus] || 'update this shipment'}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.put(`/shipments/${shipment.id}/status`, { status: newStatus });
      fetchShipments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    try {
      await api.delete(`/shipments/${id}`);
      fetchShipments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete shipment.');
    }
  };

  const nextStatus = {
    PENDING: 'ORDERED',
    ORDERED: 'IN_TRANSIT',
    IN_TRANSIT: null,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination.total} shipment{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search supplier, shipper..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="ISSUE">Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading shipments...</div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No shipments found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a shipment to start tracking inbound orders
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Shipper</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      {shipment.supplier?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shipment.shipper?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {shipment.lineItems.map((li) => (
                          <span key={li.id} className="text-xs text-muted-foreground">
                            {li.inventoryItem.name} × {li.expectedQty}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {shipment.estimatedArrival
                        ? new Date(shipment.estimatedArrival).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={shipment.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Advance status */}
                        {nextStatus[shipment.status] && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() =>
                              handleStatusUpdate(shipment, nextStatus[shipment.status])
                            }
                          >
                            <ChevronRight className="h-3 w-3" />
                            {nextStatus[shipment.status].replace('_', ' ')}
                          </Button>
                        )}
                        {/* Receive */}
                        {shipment.status === 'IN_TRANSIT' && (
                          <Button
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setReceiveOpen(true);
                            }}
                          >
                            <PackageCheck className="h-3 w-3" />
                            Receive
                          </Button>
                        )}
                        {/* Delete — PENDING only */}
                        {shipment.status === 'PENDING' && user?.role === 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(shipment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Dialogs */}
      <CreateShipmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchShipments}
      />
      <ReceiveShipmentDialog
        open={receiveOpen}
        onClose={() => { setReceiveOpen(false); setSelectedShipment(null); }}
        onSaved={fetchShipments}
        shipment={selectedShipment}
      />
    </div>
  );
}