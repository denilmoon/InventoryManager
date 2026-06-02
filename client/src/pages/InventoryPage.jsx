import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ItemFormDialog from '@/components/inventory/ItemFormDialog'; // For add/edit form (not implemented in this snippet)
import StockAdjustDialog from '@/components/inventory/StockAdjustDialog'; // For stock adjustment (not implemented in this snippet)
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
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  PackageOpen,
} from 'lucide-react';

// ─────────────────────────────────────────
// STOCK STATUS BADGE
// ─────────────────────────────────────────
function StockBadge({ status }) {
  if (status === 'OUT') {
    return <Badge variant="destructive">OUT</Badge>;
  }
  if (status === 'LOW') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        LOW
      </Badge>
    );
  }
  return <Badge variant="secondary">OK</Badge>;
}

// ─────────────────────────────────────────
// TIER BADGE
// ─────────────────────────────────────────
function TierBadge({ tier }) {
  if (tier === 'TIER_1') {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Tier 1
      </Badge>
    );
  }
  return <Badge variant="outline">Tier 2</Badge>;
}

// ─────────────────────────────────────────
// INVENTORY PAGE
// ─────────────────────────────────────────
export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters and search
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
  });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Stock adjust dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);

  // ── Fetch items ──────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 50,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (tierFilter !== 'ALL') params.tier = tierFilter;
      if (departmentFilter !== 'ALL') params.department = departmentFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/inventory', { params });
      setItems(res.data.items);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
        pages: res.data.pagination.pages,
      }));
    } catch (err) {
      setError('Failed to load inventory.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, departmentFilter, statusFilter, sortBy, sortOrder, pagination.page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Sort toggle ──────────────────────────
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ── Reset filters ────────────────────────
  const resetFilters = () => {
    setSearch('');
    setTierFilter('ALL');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('name');
    setSortOrder('asc');
  };

  // ── Handle delete ─────────────────────────
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    try {
      await api.delete(`/inventory/${itemId}`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item.');
    }
  };

  const hasActiveFilters =
    search || tierFilter !== 'ALL' || departmentFilter !== 'ALL' || statusFilter !== 'ALL';

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination.total} item{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
  <Plus className="h-4 w-4" />
  Add Item
</Button>
      </div>

      {/* Search and filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items, SKU, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tier filter */}
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tiers</SelectItem>
                <SelectItem value="TIER_1">Tier 1</SelectItem>
                <SelectItem value="TIER_2">Tier 2</SelectItem>
              </SelectContent>
            </Select>

            {/* Department filter */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                <SelectItem value="INSTALL">Install</SelectItem>
                <SelectItem value="SERVICE">Service</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="LOW">Low Stock</SelectItem>
                <SelectItem value="OUT">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading inventory...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No items found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search term'
                  : 'Add your first inventory item to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort('name')}
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                      onClick={() => toggleSort('reorderThreshold')}
                    >
                      Stock
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {/* Name + SKU */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Tier */}
                    <TableCell>
                      <TierBadge tier={item.tier} />
                    </TableCell>

                    {/* Department */}
                    <TableCell className="text-sm capitalize lowercase">
                      {item.department.charAt(0) +
                        item.department.slice(1).toLowerCase()}
                    </TableCell>

                    {/* Locations */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {item.stockCounts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No location set
                          </span>
                        ) : (
                          item.stockCounts.map((sc) => (
                            <span key={sc.id} className="text-xs text-muted-foreground">
                              {sc.location.name}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>

                    {/* Stock count */}
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">{item.totalStock}</p>
                        <p className="text-xs text-muted-foreground">
                          min {item.reorderThreshold}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StockBadge status={item.stockStatus} />
                    </TableCell>

                    {/* Tags */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(({ tag }) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Adjust stock count"
                          onClick={() => { setAdjustingItem(item); setAdjustOpen(true); }}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit item"
                            onClick={() => { setEditingItem(item); setFormOpen(true); }}
                            >
                        <Pencil className="h-4 w-4" />
                        </Button>
                        {user?.role === 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Delete item"
                            onClick={() => handleDelete(item.id)}
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
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ItemFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingItem(null); }}
        onSaved={fetchItems}
        item={editingItem}
        />
        <StockAdjustDialog
          open={adjustOpen}
          onClose={() => { setAdjustOpen(false); setAdjustingItem(null); }}
          onSaved={fetchItems}
          item={adjustingItem}
        />
    </div>
  );
}