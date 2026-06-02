import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export default function StockAdjustDialog({ open, onClose, onSaved, item }) {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch flat location list ─────────────
  useEffect(() => {
    if (!open) return;
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations/flat');
        setLocations(res.data);
      } catch {
        // fail silently
      }
    };
    fetchLocations();
  }, [open]);

  // ── Pre-fill location if item only has one ─
  useEffect(() => {
    if (!open) return;
    setError('');
    setNote('');
    setQuantity('');

    if (item?.stockCounts?.length === 1) {
      setLocationId(item.stockCounts[0].locationId);
      setQuantity(String(item.stockCounts[0].quantity));
    } else {
      setLocationId('');
      setQuantity('');
    }
  }, [item, open]);

  // ── When location changes, pre-fill current qty ─
  const handleLocationChange = (locId) => {
    setLocationId(locId);
    const existing = item?.stockCounts?.find((sc) => sc.locationId === locId);
    setQuantity(existing ? String(existing.quantity) : '0');
  };

  // ── Submit ───────────────────────────────
  const handleSubmit = async () => {
    if (!locationId) {
      setError('Please select a location.');
      return;
    }
    if (quantity === '' || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
      setError('Please enter a valid quantity (0 or more).');
      return;
    }
    if (!note.trim()) {
      setError('A note is required when adjusting stock.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/inventory/${item.id}/adjust`, {
        locationId,
        quantity: parseInt(quantity),
        note: note.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const currentCount = item.stockCounts?.find(
    (sc) => sc.locationId === locationId
  )?.quantity;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={handleLocationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locationId && currentCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                Current count at this location: {currentCount}
              </p>
            )}
          </div>

          {/* New quantity */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">New Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              placeholder="Enter new count"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {locationId && currentCount !== undefined && quantity !== '' && (
              <p className="text-xs text-muted-foreground">
                Change:{' '}
                <span
                  className={
                    parseInt(quantity) > currentCount
                      ? 'text-green-600'
                      : parseInt(quantity) < currentCount
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  }
                >
                  {parseInt(quantity) > currentCount ? '+' : ''}
                  {parseInt(quantity) - currentCount}
                </span>
              </p>
            )}
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">
              Reason for adjustment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="note"
              placeholder="e.g. Physical count correction, received items, damaged goods removed..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}