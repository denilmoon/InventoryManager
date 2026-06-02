import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const emptyForm = {
  name: '',
  sku: '',
  tier: 'TIER_2',
  department: 'OTHER',
  hasSerialNumbers: false,
  reorderThreshold: '',
  stockBaseline: '',
  estimatedShippingDays: '',
  reorderLink: '',
  pricePerPkg: '',
  unitsPerPkg: '',
  notes: '',
  tags: '',           // comma separated string in the form
  supplierId: '',
};

export default function ItemFormDialog({ open, onClose, onSaved, item }) {
  const [form, setForm] = useState(emptyForm);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!item;

  // ── Fetch suppliers for dropdown ─────────
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers');
        setSuppliers(res.data);
      } catch {
        // Suppliers not critical — fail silently
      }
    };
    fetchSuppliers();
  }, []);

  // ── Pre-fill form when editing ───────────
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        sku: item.sku || '',
        tier: item.tier || 'TIER_2',
        department: item.department || 'OTHER',
        hasSerialNumbers: item.hasSerialNumbers || false,
        reorderThreshold: item.reorderThreshold ?? '',
        stockBaseline: item.stockBaseline ?? '',
        estimatedShippingDays: item.estimatedShippingDays ?? '',
        reorderLink: item.reorderLink || '',
        pricePerPkg: item.pricePerPkg ?? '',
        unitsPerPkg: item.unitsPerPkg ?? '',
        notes: item.notes || '',
        tags: item.tags?.map(({ tag }) => tag.name).join(', ') || '',
        supplierId: item.supplierId || 'none',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [item, open]);

  // ── Field change handler ─────────────────
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Submit ───────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Item name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse tags from comma separated string
      const tags = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        tier: form.tier,
        department: form.department,
        hasSerialNumbers: form.hasSerialNumbers,
        reorderThreshold: form.reorderThreshold !== '' ? parseInt(form.reorderThreshold) : 0,
        stockBaseline: form.stockBaseline !== '' ? parseInt(form.stockBaseline) : 0,
        estimatedShippingDays: form.estimatedShippingDays !== ''
          ? parseInt(form.estimatedShippingDays)
          : null,
        reorderLink: form.reorderLink.trim() || null,
        pricePerPkg: form.pricePerPkg !== '' ? parseFloat(form.pricePerPkg) : null,
        unitsPerPkg: form.unitsPerPkg !== '' ? parseInt(form.unitsPerPkg) : null,
        notes: form.notes.trim() || null,
        supplierId: form.supplierId && form.supplierId !== 'none' ? form.supplierId : null,
        tags,
      };

      if (isEditing) {
        await api.put(`/inventory/${item.id}`, payload);
        // Update tags separately
        await api.put(`/inventory/${item.id}/tags`, { tags });
      } else {
        await api.post('/inventory', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">
                Item Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. ERO385 RO System"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Supplier SKU (optional)"
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="RO, filter, install (comma separated)"
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
              />
            </div>
          </div>

          <Separator />

{/* Classification */}
<div className="flex flex-col gap-4">

  {/* Tier */}
  <div className="flex flex-col gap-1.5">
    <Label>Tier</Label>
    <Select value={form.tier} onValueChange={(v) => handleChange('tier', v)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="TIER_1">Tier 1 — Revenue item</SelectItem>
        <SelectItem value="TIER_2">Tier 2 — Consumable supply</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Department */}
  <div className="flex flex-col gap-1.5">
    <Label>Department</Label>
    <Select
      value={form.department}
      onValueChange={(v) => handleChange('department', v)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="INSTALL">Install</SelectItem>
        <SelectItem value="SERVICE">Service</SelectItem>
        <SelectItem value="MIXED">Mixed</SelectItem>
        <SelectItem value="OTHER">Other</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Supplier */}
  <div className="flex flex-col gap-1.5">
    <Label>Supplier</Label>
    <Select
      value={form.supplierId}
      onValueChange={(v) => handleChange('supplierId', v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select supplier (optional)" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="none">No supplier</SelectItem>
        {suppliers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Serial numbers */}
  <div className="flex items-center gap-2">
    <Checkbox
      id="hasSerialNumbers"
      checked={form.hasSerialNumbers}
      onCheckedChange={(v) => handleChange('hasSerialNumbers', v)}
    />
    <Label htmlFor="hasSerialNumbers" className="cursor-pointer font-normal">
      Items have serial numbers
    </Label>
  </div>

</div>

<Separator />

          {/* Stock settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
              <Input
                id="reorderThreshold"
                type="number"
                min="0"
                placeholder="0"
                value={form.reorderThreshold}
                onChange={(e) => handleChange('reorderThreshold', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stockBaseline">Stock Baseline</Label>
              <Input
                id="stockBaseline"
                type="number"
                min="0"
                placeholder="0"
                value={form.stockBaseline}
                onChange={(e) => handleChange('stockBaseline', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimatedShippingDays">Ship Days</Label>
              <Input
                id="estimatedShippingDays"
                type="number"
                min="0"
                placeholder="Days"
                value={form.estimatedShippingDays}
                onChange={(e) =>
                  handleChange('estimatedShippingDays', e.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitsPerPkg">Units / Pkg</Label>
              <Input
                id="unitsPerPkg"
                type="number"
                min="0"
                placeholder="0"
                value={form.unitsPerPkg}
                onChange={(e) => handleChange('unitsPerPkg', e.target.value)}
              />
            </div>
          </div>

          {/* Pricing and reorder link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricePerPkg">Price / Package ($)</Label>
              <Input
                id="pricePerPkg"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.pricePerPkg}
                onChange={(e) => handleChange('pricePerPkg', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reorderLink">Reorder Link</Label>
              <Input
                id="reorderLink"
                placeholder="https://supplier.com/order/..."
                value={form.reorderLink}
                onChange={(e) => handleChange('reorderLink', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this item..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}