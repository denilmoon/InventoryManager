import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Plus, X, ChevronRight, ChevronLeft, Send } from 'lucide-react';

// ─────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────
function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
        ${currentStep >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
        1
      </div>
      <span className={`text-xs ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
        Recipient
      </span>
      <div className="flex-1 h-px bg-gray-200" />
      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
        ${currentStep >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
        2
      </div>
      <span className={`text-xs ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
        Items
      </span>
      <div className="flex-1 h-px bg-gray-200" />
      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
        ${currentStep >= 3 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
        3
      </div>
      <span className={`text-xs ${currentStep >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
        Confirm
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// DISPATCH DIALOG
// ─────────────────────────────────────────
export default function DispatchDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Step 1 state
  const [recipientType, setRecipientType] = useState('');
  const [installerTeamId, setInstallerTeamId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2 state
  const [lineItems, setLineItems] = useState([]);

  // ── Fetch data on open ───────────────────
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [teamsRes, techsRes, invRes, locRes] = await Promise.all([
          api.get('/people/teams'),
          api.get('/people/technicians'),
          api.get('/inventory', { params: { limit: 200 } }),
          api.get('/locations/flat'),
        ]);
        setTeams(teamsRes.data);
        setTechnicians(techsRes.data);
        setInventory(invRes.data.items);
        setLocations(locRes.data);
      } catch {
        // fail silently
      }
    };
    fetchData();
    // Reset state on open
    setStep(1);
    setRecipientType('');
    setInstallerTeamId('');
    setTechnicianId('');
    setNotes('');
    setLineItems([]);
    setSearch('');
    setError('');
  }, [open]);

  // ── Step 1 → Step 2 ─────────────────────
  const handleNextStep = () => {
    if (!recipientType) { setError('Please select a recipient type.'); return; }
    if (recipientType === 'INSTALLER_TEAM' && !installerTeamId) {
      setError('Please select an installer team.');
      return;
    }
    if (recipientType === 'TECHNICIAN' && !technicianId) {
      setError('Please select a technician.');
      return;
    }
    setError('');
    setStep(2);
  };

  // ── Add item to dispatch ─────────────────
  const addItem = (item) => {
    const existing = lineItems.find((li) => li.inventoryItemId === item.id);
    if (existing) return; // already added
    if (item.totalStock === 0) return; // no stock
    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: '1',
        sourceLocationId: item.stockCounts[0]?.locationId || '',
        availableStock: item.totalStock,
        stockCounts: item.stockCounts,
      },
    ]);
  };

  const removeItem = (itemId) =>
    setLineItems((prev) => prev.filter((li) => li.inventoryItemId !== itemId));

  const updateLineItem = (itemId, field, value) =>
    setLineItems((prev) =>
      prev.map((li) => (li.inventoryItemId === itemId ? { ...li, [field]: value } : li))
    );

  // ── Step 2 → Step 3 ─────────────────────
  const handleReviewStep = () => {
    if (lineItems.length === 0) {
      setError('Add at least one item to dispatch.');
      return;
    }
    if (lineItems.some((li) => !li.quantity || parseInt(li.quantity) < 1)) {
      setError('All items need a quantity of at least 1.');
      return;
    }
    if (lineItems.some((li) => parseInt(li.quantity) > li.availableStock)) {
      setError('One or more items exceed available stock.');
      return;
    }
    if (lineItems.some((li) => !li.sourceLocationId)) {
      setError('All items need a source location.');
      return;
    }
    setError('');
    setStep(3);
  };

  // ── Submit dispatch ──────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/dispatch', {
        recipientType,
        installerTeamId: recipientType === 'INSTALLER_TEAM' ? installerTeamId : null,
        technicianId: recipientType === 'TECHNICIAN' ? technicianId : null,
        notes: notes || null,
        lineItems: lineItems.map((li) => ({
          inventoryItemId: li.inventoryItemId,
          quantity: parseInt(li.quantity),
          sourceLocationId: li.sourceLocationId,
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
      setStep(2); // go back to items on error
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered inventory for search ────────
  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.tags?.some(({ tag }) => tag.name.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Recipient label for confirm step ─────
  const recipientLabel = recipientType === 'INSTALLER_TEAM'
    ? teams.find((t) => t.id === installerTeamId)?.name
    : technicians.find((t) => t.id === technicianId)?.name;

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispatch Items</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={step} />
        <Separator className="mb-4" />

        {/* ── STEP 1 — RECIPIENT ────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Recipient Type <span className="text-red-500">*</span></Label>
              <Select
                value={recipientType}
                onValueChange={(v) => {
                  setRecipientType(v);
                  setInstallerTeamId('');
                  setTechnicianId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who is this going to?" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="INSTALLER_TEAM">Installer Team</SelectItem>
                  <SelectItem value="TECHNICIAN">Service Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'INSTALLER_TEAM' && (
              <div className="flex flex-col gap-1.5">
                <Label>Select Team <span className="text-red-500">*</span></Label>
                <Select value={installerTeamId} onValueChange={setInstallerTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose installer team" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {recipientType === 'TECHNICIAN' && (
              <div className="flex flex-col gap-1.5">
                <Label>Select Technician <span className="text-red-500">*</span></Label>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose technician" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.vehicle && (
                          <span className="text-muted-foreground ml-1">
                            · {t.vehicle.licensePlate}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Any notes for this dispatch (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* ── STEP 2 — ITEMS ───────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {/* Search inventory */}
            <div className="flex flex-col gap-1.5">
              <Label>Search Items</Label>
              <Input
                placeholder="Search by name or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Inventory list */}
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {filteredInventory.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">
                  No items found
                </p>
              ) : (
                filteredInventory.map((item) => {
                  const alreadyAdded = lineItems.some(
                    (li) => li.inventoryItemId === item.id
                  );
                  const outOfStock = item.totalStock === 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5"
                    >
                      <div>
                        <p className={`text-sm font-medium ${outOfStock ? 'text-muted-foreground' : ''}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.totalStock} in stock
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        disabled={alreadyAdded || outOfStock}
                        onClick={() => addItem(item)}
                      >
                        <Plus className="h-3 w-3" />
                        {alreadyAdded ? 'Added' : outOfStock ? 'No Stock' : 'Add'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected items */}
            {lineItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Items to Dispatch ({lineItems.length})</Label>
                {lineItems.map((li) => (
                  <div key={li.inventoryItemId} className="flex flex-col gap-2 p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{li.itemName}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => removeItem(li.inventoryItemId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          max={li.availableStock}
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(li.inventoryItemId, 'quantity', e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {li.availableStock}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">From Location</Label>
                        <Select
                          value={li.sourceLocationId}
                          onValueChange={(v) =>
                            updateLineItem(li.inventoryItemId, 'sourceLocationId', v)
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Location" />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4}>
                            {li.stockCounts
                              .filter((sc) => sc.quantity > 0)
                              .map((sc) => (
                                <SelectItem key={sc.locationId} value={sc.locationId}>
                                  {sc.location?.name || sc.locationId} ({sc.quantity})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* ── STEP 3 — CONFIRM ─────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Recipient</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {recipientType === 'INSTALLER_TEAM' ? 'Installer Team' : 'Technician'}
                  </Badge>
                  <p className="text-sm font-medium">{recipientLabel}</p>
                </div>
              </div>

              {notes && (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm text-right max-w-xs">{notes}</p>
                </div>
              )}

              <Separator />

              <p className="text-sm font-medium">
                Items ({lineItems.length})
              </p>
              {lineItems.map((li) => {
                const locationName = locations.find(
                  (l) => l.id === li.sourceLocationId
                )?.name || li.sourceLocationId;
                return (
                  <div key={li.inventoryItemId} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{li.itemName}</p>
                      <p className="text-xs text-muted-foreground">From: {locationName}</p>
                    </div>
                    <p className="text-sm font-medium">× {li.quantity}</p>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Stock counts will be decremented immediately upon confirmation.
              This action cannot be undone.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* ── FOOTER NAVIGATION ─────────────── */}
        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
              disabled={loading}
            >
              {step === 1 ? (
                'Cancel'
              ) : (
                <span className="flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </span>
              )}
            </Button>

            {step === 1 && (
              <Button onClick={handleNextStep} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={handleReviewStep}
                disabled={lineItems.length === 0}
                className="gap-1"
              >
                Review <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                <Send className="h-4 w-4" />
                {loading ? 'Dispatching...' : 'Confirm Dispatch'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}