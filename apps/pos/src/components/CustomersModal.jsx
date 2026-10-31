import React, { useState } from 'react';
import { Search, UserPlus, Check, Phone, Mail, Award, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

export default function CustomersModal({
  isOpen,
  onClose,
  onSelectCustomer,
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New Customer Form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSearch = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${encodeURIComponent(query)}&limit=10`);
      setCustomers(data?.customers || (Array.isArray(data) ? data : []));
    } catch (_err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/customers', {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
      });
      toast.success('Customer registered successfully!');
      const created = data?.customer || data;
      onSelectCustomer(created.name, created.phone);
      setIsAdding(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Management"
      subtitle="Lookup existing patrons or register new guests"
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            icon={UserPlus}
          >
            {isAdding ? 'Back to Search' : 'Add New Customer'}
          </Button>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isAdding ? (
        <form onSubmit={handleCreateCustomer} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold uppercase text-pos-muted block mb-1">
              Full Name *
            </label>
            <Input
              placeholder="e.g. Rahul Sharma"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-pos-muted block mb-1">
              Phone Number (10 digits) *
            </label>
            <Input
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-pos-muted block mb-1">
              Email Address (optional)
            </label>
            <Input
              type="email"
              placeholder="guest@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            className="w-full mt-2 font-bold"
          >
            Save and Link to Order →
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-pos-muted" />
              <input
                type="text"
                placeholder="Search by 10-digit mobile or name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white border border-pos-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-pos-text placeholder:text-pos-muted/60 focus:outline-none focus:border-pos-accent"
              />
            </div>
            <Button type="submit" variant="secondary" size="md" loading={loading}>
              Search
            </Button>
          </form>

          {/* Results List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pos-scrollbar">
            {customers.map((c) => (
              <div
                key={c._id || c.phone}
                className="p-3 rounded-xl bg-pos-raised border border-pos-border flex items-center justify-between hover:border-pos-accent transition"
              >
                <div>
                  <div className="font-bold text-sm text-pos-text">{c.name}</div>
                  <div className="text-xs text-pos-muted flex items-center gap-2 mt-0.5">
                    <span>{c.phone}</span>
                    {c.loyaltyPoints > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Award size={12} /> {c.loyaltyPoints} pts
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onSelectCustomer(c.name, c.phone);
                    onClose();
                  }}
                  className="font-bold text-xs"
                >
                  Select <Check size={13} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
