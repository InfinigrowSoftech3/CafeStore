import { useState, useMemo } from 'react';
import {
  Search, Filter, SlidersHorizontal, Download, ArrowUpDown, Copy, Check,
  MoreVertical, Eye, ArrowUpRight, ShieldAlert, CheckCircle2, UserPlus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Store, ExternalLink,
  Layers, UtensilsCrossed, Calendar, Mail, User, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { env } from '../../config/env';

// Plan Quota Caps for visual usage progress calculation
const PLAN_LIMITS = {
  starter: { maxTables: 15, maxProducts: 45 },
  pro: { maxTables: 50, maxProducts: 250 },
  enterprise: { maxTables: 150, maxProducts: 500 },
};

function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export default function TenantTable({
  tenants = [],
  loading = false,
  onRowClick,
  onOpenPanel,
  onImpersonate,
  onToggleStatus,
  onChangePlan,
  onInviteOwner,
  onViewAudit,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [planFilter, setPlanFilter] = useState('all'); // 'all' | 'starter' | 'pro' | 'enterprise'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'products'
  const [density, setDensity] = useState('normal'); // 'normal' | 'compact'
  const [visibleColumns, setVisibleColumns] = useState({
    owner: true,
    status: true,
    plan: true,
    usage: true,
    joined: true,
  });

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);

  // Copy storefront link
  const handleCopySubdomain = (e, slug) => {
    e.stopPropagation();
    const customerBase = env?.customerUrl || 'https://cafestore-customer.vercel.app';
    const url = `${customerBase}/menu?cafe=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success(`Copied live URL: ${url}`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Filter & Sort Pipeline
  const filteredTenants = useMemo(() => {
    return tenants
      .filter((t) => {
        const matchesSearch =
          !search ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus =
          statusFilter === 'all' || t.status === statusFilter;

        const matchesPlan =
          planFilter === 'all' || (t.plan || 'starter').toLowerCase() === planFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesPlan;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'products') return (b.productCount || 0) - (a.productCount || 0);
        return 0;
      });
  }, [tenants, search, statusFilter, planFilter, sortBy]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredTenants.length / pageSize) || 1;
  const paginatedTenants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTenants.slice(start, start + pageSize);
  }, [filteredTenants, page, pageSize]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredTenants.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Name', 'Slug', 'Status', 'Plan', 'Owner Email', 'Table Count', 'Product Count', 'Created At'],
      ...filteredTenants.map((t) => [
        t.id,
        t.name,
        t.slug,
        t.status,
        t.plan,
        t.ownerEmail || 'Unassigned',
        t.tableCount || 0,
        t.productCount || 0,
        new Date(t.createdAt).toISOString(),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brewhaus_cafes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredTenants.length} cafés to CSV!`);
  };

  // Bulk status update
  const handleBulkStatusChange = (newStatus) => {
    if (selectedIds.size === 0) return;
    toast.success(`Triggered bulk ${newStatus} for ${selectedIds.size} café(s).`);
    selectedIds.forEach((id) => {
      const t = tenants.find((item) => item.id === id);
      if (t && t.status !== newStatus) {
        onToggleStatus(t, `Bulk administrative ${newStatus}`);
      }
    });
    setSelectedIds(new Set());
  };

  // Avatar generator helper
  const getAvatarInitials = (name) => {
    if (!name) return 'CA';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const getStatusStyles = (status) => {
    if (status === 'active') {
      return {
        bg: 'var(--status-active-bg)',
        text: 'var(--status-active-text)',
        border: 'var(--status-active-border)',
        dot: 'var(--status-active-text)',
      };
    }
    return {
      bg: 'var(--status-suspended-bg)',
      text: 'var(--status-suspended-text)',
      border: 'var(--status-suspended-border)',
      dot: 'var(--status-suspended-text)',
    };
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 sm:p-4 shadow-xs md:flex-row md:items-center md:justify-between transition-colors">
        {/* Left: Search input */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search cafés by name, slug, or owner email..."
            className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--input-bg)] pl-10 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--sa-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sa-primary)] transition"
          />
        </div>

        {/* Right: Filters, Sort, Density, Export */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none rounded-xl border border-[var(--border-primary)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:outline-none min-w-[120px]"
          >
            <option value="all">Status: All</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none rounded-xl border border-[var(--border-primary)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:outline-none min-w-[120px]"
          >
            <option value="all">Plan: All Tiers</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 sm:flex-none rounded-xl border border-[var(--border-primary)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:outline-none min-w-[120px]"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="products">Sort: Menu Size</option>
          </select>

          {/* Density Toggle (Desktop only) */}
          <button
            onClick={() => setDensity((d) => (d === 'normal' ? 'compact' : 'normal'))}
            className="hidden md:inline-flex rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Toggle Row Density"
          >
            {density === 'normal' ? 'Comfortable' : 'Compact'}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition w-full sm:w-auto"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Bulk Actions Floating Bar ────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[var(--sa-primary-border)] bg-[var(--sa-primary-subtle)] px-4 py-2.5 text-xs text-[var(--sa-primary)] shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--sa-primary)]">{selectedIds.size}</span>
            <span>café(s) selected across current filter</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('active')}
              className="rounded-lg border border-[var(--sa-success-border)] bg-[var(--sa-success-bg)] px-3 py-1 font-semibold text-[var(--sa-success-text)] hover:bg-[var(--sa-success-bg)] hover:opacity-90 transition"
            >
              Reactivate Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('suspended')}
              className="rounded-lg border border-[var(--sa-accent-border)] bg-[var(--sa-accent-subtle)] px-3 py-1 font-semibold text-[var(--sa-accent-text)] hover:bg-[var(--sa-accent-hover-bg)] transition"
            >
              Suspend Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg bg-[var(--hover-bg)] px-2.5 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Main Table & Mobile Card Card Container ───────────────── */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--sa-primary)] border-t-transparent" />
            <p className="text-xs">Loading registered platform cafés...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] space-y-3 px-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hover-bg)] text-[var(--text-muted)]">
              <Store size={24} />
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">No cafés found</div>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              No registered cafés match your search query or active filter criteria.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPlanFilter('all');
              }}
              className="rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* ── MOBILE VIEW: Touch-Friendly Card List (< 640px) ───── */}
            <div className="block sm:hidden divide-y divide-[var(--table-border)]">
              {paginatedTenants.map((t) => {
                const isSelected = selectedIds.has(t.id);
                const isSuspended = t.status === 'suspended';
                const limits = PLAN_LIMITS[t.plan || 'starter'] || PLAN_LIMITS.starter;
                const tablePercent = Math.min(100, Math.round(((t.tableCount || 0) / limits.maxTables) * 100));
                const productPercent = Math.min(100, Math.round(((t.productCount || 0) / limits.maxProducts) * 100));
                const statusStyles = getStatusStyles(t.status);

                return (
                  <div
                    key={t.id}
                    onClick={() => onRowClick && onRowClick(t)}
                    className={`p-4 space-y-3 transition active:bg-[var(--hover-bg)] ${
                      isSelected ? 'bg-[var(--table-row-selected)]' : 'bg-[var(--bg-card)]'
                    }`}
                  >
                    {/* Top Row: Avatar, Name, Status & Checkbox */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--sa-primary-subtle)] to-[var(--sa-primary-tint)] border border-[var(--sa-primary-border)] text-[var(--sa-primary)] font-bold text-xs shadow-inner">
                          {t.settings?.logoUrl ? (
                            <img src={t.settings.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            getAvatarInitials(t.name)
                          )}
                        </div>

                        <div className="min-w-0 truncate">
                          <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{t.name}</h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                              {t.slug}
                            </span>
                            <button
                              onClick={(e) => handleCopySubdomain(e, t.slug)}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--sa-primary)] transition"
                              title="Copy live link"
                            >
                              {copiedSlug === t.slug ? <Check size={12} className="text-[var(--sa-success)]" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status pill & Checkbox */}
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: statusStyles.bg,
                            color: statusStyles.text,
                            borderColor: statusStyles.border,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusStyles.dot }} />
                          {t.status}
                        </span>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(e, t.id)}
                          className="rounded border-[var(--border-primary)] text-[var(--sa-primary)] focus:ring-[var(--sa-primary)] h-4 w-4"
                        />
                      </div>
                    </div>

                    {/* Meta row: Owner & Plan */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-[var(--border-primary)]/60 py-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Owner</span>
                        <span className="font-medium text-[var(--text-primary)] truncate block">
                          {t.ownerName && t.ownerName !== 'N/A' ? t.ownerName : t.ownerEmail || 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Plan Tier</span>
                        <span className="font-bold text-[var(--sa-primary)] capitalize block">{t.plan || 'Starter'}</span>
                      </div>
                    </div>

                    {/* Quota meters */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-muted)]">Tables: {t.tableCount || 0}/{limits.maxTables}</span>
                        <span className="text-[var(--text-muted)]">Items: {t.productCount || 0}/{limits.maxProducts}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-1.5 w-full rounded-full bg-[var(--border-primary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${tablePercent > 85 ? 'bg-[var(--sa-warning-text)]' : 'bg-[var(--sa-primary)]'}`}
                            style={{ width: `${tablePercent}%` }}
                          />
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[var(--border-primary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${productPercent > 85 ? 'bg-[var(--sa-warning-text)]' : 'bg-[var(--sa-success)]'}`}
                            style={{ width: `${productPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between pt-1 gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRowClick && onRowClick(t)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] text-xs font-semibold text-[var(--text-secondary)] text-center"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => onOpenPanel && onOpenPanel(t)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--sa-primary)]/30 bg-[var(--sa-primary-subtle)] text-xs font-semibold text-[var(--sa-primary)] text-center inline-flex items-center justify-center gap-1"
                      >
                        <Eye size={12} /> Storefront
                      </button>
                      <button
                        onClick={() => onImpersonate && onImpersonate(t)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--sa-primary)]/30 bg-[var(--sa-primary-subtle)] text-xs font-semibold text-[var(--sa-primary)] text-center inline-flex items-center justify-center gap-1"
                      >
                        <ArrowUpRight size={12} /> Impersonate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP VIEW: Full Data Table (>= 640px) ───────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--table-header-bg)] border-b border-[var(--table-border)]">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredTenants.length > 0 &&
                          selectedIds.size === filteredTenants.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-[var(--border-primary)] bg-[var(--input-bg)] text-[var(--sa-primary)] focus:ring-[var(--sa-primary)]"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Café & Subdomain</th>
                    {visibleColumns.owner && <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Owner</th>}
                    {visibleColumns.status && <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Status</th>}
                    {visibleColumns.plan && <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Plan</th>}
                    {visibleColumns.usage && <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Usage vs Quota</th>}
                    {visibleColumns.joined && <th className="py-3 px-4 font-bold text-[var(--text-secondary)]">Joined</th>}
                    <th className="py-3 px-6 font-bold text-[var(--text-secondary)] text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--table-border)] text-[var(--text-primary)]">
                  {paginatedTenants.map((t) => {
                    const isSelected = selectedIds.has(t.id);
                    const isSuspended = t.status === 'suspended';
                    const limits = PLAN_LIMITS[t.plan || 'starter'] || PLAN_LIMITS.starter;
                    const tablePercent = Math.min(100, Math.round(((t.tableCount || 0) / limits.maxTables) * 100));
                    const productPercent = Math.min(100, Math.round(((t.productCount || 0) / limits.maxProducts) * 100));
                    const isOwnerUnassigned = !t.ownerEmail || t.ownerEmail === 'N/A';
                    const statusStyles = getStatusStyles(t.status);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => onRowClick && onRowClick(t)}
                        className={`cursor-pointer transition group ${
                          isSelected
                            ? 'bg-[var(--table-row-selected)]'
                            : 'hover:bg-[var(--table-row-hover)]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(e, t.id)}
                            className="rounded border-[var(--border-primary)] bg-[var(--input-bg)] text-[var(--sa-primary)] focus:ring-[var(--sa-primary)]"
                          />
                        </td>

                        {/* Café & Subdomain */}
                        <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--sa-primary-subtle)] to-[var(--sa-primary-tint)] border border-[var(--sa-primary-border)] text-[var(--sa-primary)] font-bold text-xs shadow-inner">
                              {t.settings?.logoUrl ? (
                                <img src={t.settings.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                              ) : (
                                getAvatarInitials(t.name)
                              )}
                            </div>

                            <div>
                              <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--sa-primary)] transition flex items-center gap-1.5">
                                <span>{t.name}</span>
                              </div>

                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                                  {t.slug}
                                </span>
                                <button
                                  onClick={(e) => handleCopySubdomain(e, t.slug)}
                                  className="p-0.5 text-[var(--text-muted)] hover:text-[var(--sa-primary)] transition"
                                  title="Copy live storefront link"
                                >
                                  {copiedSlug === t.slug ? <Check size={11} className="text-[var(--sa-success)]" /> : <Copy size={11} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        {visibleColumns.owner && (
                          <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                            {isOwnerUnassigned ? (
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="rounded-md border border-[var(--border-primary)] bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                  Unassigned
                                </span>
                                <button
                                  onClick={() => onInviteOwner && onInviteOwner(t)}
                                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--sa-primary)] hover:underline"
                                >
                                  <UserPlus size={11} /> Invite
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-[var(--text-primary)] truncate max-w-[170px]">
                                  {t.ownerName && t.ownerName !== 'N/A' ? t.ownerName : t.ownerEmail}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[170px]">{t.ownerEmail}</div>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                              style={{
                                backgroundColor: statusStyles.bg,
                                color: statusStyles.text,
                                borderColor: statusStyles.border,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: statusStyles.dot }}
                              />
                              {t.status}
                            </span>
                          </td>
                        )}

                        {/* Plan */}
                        {visibleColumns.plan && (
                          <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangePlan && onChangePlan(t);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--hover-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--sa-primary)]/50 hover:text-[var(--sa-primary)] transition"
                              title="Click to change plan"
                            >
                              <span className="capitalize">{t.plan || 'Starter'}</span>
                              <span className="text-[9px] text-[var(--text-muted)]">✎</span>
                            </button>
                          </td>
                        )}

                        {/* Usage Progress */}
                        {visibleColumns.usage && (
                          <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                            <div className="space-y-1.5 min-w-[120px]">
                              {/* Tables Usage */}
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-[var(--text-muted)]">Tables</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {t.tableCount || 0}/{limits.maxTables}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-[var(--border-primary)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    tablePercent > 85 ? 'bg-[var(--sa-warning-text)]' : 'bg-[var(--sa-primary)]'
                                  }`}
                                  style={{ width: `${tablePercent}%` }}
                                />
                              </div>

                              {/* Products Usage */}
                              <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-[var(--text-muted)]">Items</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {t.productCount || 0}/{limits.maxProducts}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-[var(--border-primary)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    productPercent > 85 ? 'bg-[var(--sa-warning-text)]' : 'bg-[var(--sa-success)]'
                                  }`}
                                  style={{ width: `${productPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Joined Date */}
                        {visibleColumns.joined && (
                          <td className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-4`}>
                            <div className="text-[var(--text-primary)]" title={new Date(t.createdAt).toLocaleString()}>
                              {formatRelativeTime(t.createdAt)}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                        )}

                        {/* Actions */}
                        <td
                          className={`${density === 'compact' ? 'py-2.5' : 'py-3.5'} px-6 text-right`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Primary: Open User Panel */}
                            <button
                              onClick={() => onOpenPanel && onOpenPanel(t)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[var(--sa-primary)]/30 bg-[var(--sa-primary-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--sa-primary)] hover:bg-[var(--sa-primary-subtle)] hover:opacity-90 transition"
                              title="Open Customer QR Ordering Panel"
                            >
                              <Eye size={13} />
                              <span>Open panel</span>
                            </button>

                            {/* Overflow Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenActionId(openActionId === t.id ? null : t.id)}
                                className="rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                                title="More options"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {openActionId === t.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-[var(--border-primary)] bg-[var(--popover-bg)] p-1.5 shadow-2xl text-xs z-30"
                                >
                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onImpersonate && onImpersonate(t);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                                  >
                                    <ArrowUpRight size={13} /> Impersonate Session
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onChangePlan && onChangePlan(t);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                                  >
                                    <Layers size={13} /> Change Plan Tier
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onRowClick && onRowClick(t);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                                  >
                                    <Store size={13} /> View Café Drawer
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onViewAudit && onViewAudit(t);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                                  >
                                    <Calendar size={13} /> Audit History
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      navigator.clipboard.writeText(t.id);
                                      toast.success(`Copied ID: ${t.id}`);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                                  >
                                    <Copy size={13} /> Copy Tenant ID
                                  </button>

                                  <div className="my-1 border-t border-[var(--border-primary)]" />

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onToggleStatus && onToggleStatus(t);
                                    }}
                                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition text-left ${
                                      isSuspended
                                        ? 'text-[var(--sa-success-text)] hover:bg-[var(--sa-success-bg)]'
                                        : 'text-[var(--sa-danger-text)] hover:bg-[var(--sa-danger-bg)]'
                                    }`}
                                  >
                                    <ShieldAlert size={13} />
                                    {isSuspended ? 'Reactivate Café' : 'Suspend Café'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Pagination Footer ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[var(--border-primary)]/80 bg-[var(--hover-bg)]/70 px-4 sm:px-6 py-4 text-xs text-[var(--text-muted)] transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing{' '}
              <strong className="text-[var(--text-primary)] font-bold">
                {filteredTenants.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-[var(--text-primary)] font-bold">
                {Math.min(filteredTenants.length, page * pageSize)}
              </strong>{' '}
              of <strong className="text-[var(--text-primary)] font-bold">{filteredTenants.length}</strong> cafés
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--border-primary)]">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-[var(--border-primary)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:outline-none min-w-[50px]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 text-[var(--text-secondary)] font-medium">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
