import React, { useState, useMemo } from 'react';
import { normalizeVietnamese } from '../../utils/stringUtils';
import { 
  Users, Plus, Search, Edit3, Trash2, Phone, Mail, Building2, 
  ChevronLeft, ChevronRight, X, Save, FileText, Receipt,
  TrendingUp, Calendar, MapPin, Hash, AlertTriangle
} from 'lucide-react';
import { Customer, formatVND, formatDate, Quote, Invoice } from '../../types/business';
import { useBusinessDatabase } from '../../hooks/useBusinessDatabaseApi';
import { useGlobalAddressData } from '../../hooks/useGlobalAddressData';
import { BusinessHeader } from './BusinessHeader';

interface CustomersPageProps {
  onClose?: () => void;
}

// --- CUSTOMER FORM MODAL ---
const CustomerFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ isOpen, onClose, customer, onSave }) => {
  const { countries, getStatesByCountry, getCitiesByState } = useGlobalAddressData();
  const [selectedCountry, setSelectedCountry] = useState<string>('VN');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    taxCode: '',
    notes: '',
  });

  React.useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        address: customer.address,
        taxCode: customer.taxCode || '',
        notes: customer.notes || '',
      });
    } else {
      setFormData({ name: '', email: '', phone: '', company: '', address: '', taxCode: '', notes: '' });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }
    
    // Combine address fields
    const countryName = countries.find(c => c.isoCode === selectedCountry)?.name || '';
    const stateName = selectedState ? getStatesByCountry(selectedCountry).find(s => s.isoCode === selectedState)?.name || '' : '';
    const cityName = selectedCity || '';
    const detailAddress = formData.address || '';
    
    // Build full address string
    const addressParts = [detailAddress, cityName, stateName, countryName].filter(Boolean);
    const fullAddress = addressParts.join(', ');
    
    onSave({
      ...formData,
      address: fullAddress,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            {customer ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0901234567"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Công ty</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Tên công ty"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Quốc gia</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedState('');
                  setSelectedCity('');
                }}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn quốc gia</option>
                {countries.map(country => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tỉnh/Bang</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('');
                }}
                disabled={!selectedCountry}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Chọn tỉnh/bang</option>
                {selectedCountry && getStatesByCountry(selectedCountry).map(state => (
                  <option key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Thành phố</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedState}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Chọn thành phố</option>
                {selectedState && getCitiesByState(selectedCountry, selectedState).map(city => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Địa chỉ chi tiết</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Số nhà, đường, phố..."
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã số thuế</label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0123456789"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Ghi chú về khách hàng..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Save size={16} />
              {customer ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- CUSTOMER DETAIL MODAL ---
const CustomerDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  quotes: { id: string; quoteNumber: string; total: number; status: string; createdAt: string }[];
  invoices: { id: string; invoiceNumber: string; total: number; status: string; createdAt: string }[];
}> = ({ isOpen, onClose, customer, quotes, invoices }) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              {customer.name}
            </h3>
            <p className="text-sm text-slate-500">{customer.company}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-5 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Mail size={12} /> Email
              </div>
              <div className="font-medium">{customer.email || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Phone size={12} /> Điện thoại
              </div>
              <div className="font-medium">{customer.phone || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <MapPin size={12} /> Địa chỉ
              </div>
              <div className="font-medium">{customer.address || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Hash size={12} /> MST
              </div>
              <div className="font-medium">{customer.taxCode || '-'}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600">{customer.totalOrders}</div>
              <div className="text-xs text-indigo-500">Đơn hàng</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">{formatVND(customer.totalSpent)}</div>
              <div className="text-xs text-green-500">Tổng chi tiêu</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <div className="text-sm font-bold text-slate-600">{formatDate(customer.createdAt)}</div>
              <div className="text-xs text-slate-500">Ngày tạo</div>
            </div>
          </div>

          {/* Recent Quotes */}
          {quotes.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-amber-500" />
                Báo giá gần đây
              </h4>
              <div className="space-y-2">
                {quotes.slice(0, 3).map(q => (
                  <div key={q.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-sm">
                    <span className="font-mono">{q.quoteNumber}</span>
                    <span className="font-medium">{formatVND(q.total)}</span>
                    <span className="text-slate-500">{formatDate(q.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Receipt size={16} className="text-emerald-500" />
                Hóa đơn gần đây
              </h4>
              <div className="space-y-2">
                {invoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-sm">
                    <span className="font-mono">{inv.invoiceNumber}</span>
                    <span className="font-medium">{formatVND(inv.total)}</span>
                    <span className="text-slate-500">{formatDate(inv.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2">Ghi chú</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export const CustomersPage: React.FC<CustomersPageProps> = ({ onClose }) => {
  const { 
    customers, quotes, invoices, addCustomer, updateCustomer, deleteCustomer, 
    isLoaded, loading, error, loadData
  } = useBusinessDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const itemsPerPage = 10;

  // Filter customers
  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeVietnamese(searchTerm);
    return customers.filter((c: Customer) => 
      normalizeVietnamese(c.name).includes(normalizedSearch) ||
      normalizeVietnamese(c.email).includes(normalizedSearch) ||
      normalizeVietnamese(c.company).includes(normalizedSearch) ||
      normalizeVietnamese(c.phone).includes(normalizedSearch)
    );
  }, [customers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => ({
    total: customers.length,
    totalOrders: customers.reduce((sum: number, c: Customer) => sum + c.totalOrders, 0),
    totalSpent: customers.reduce((sum: number, c: Customer) => sum + Number(c.totalSpent || 0), 0),
    vip: customers.filter((c: Customer) => c.totalOrders >= 10).length,
  }), [customers]);

  // Get customer's quotes and invoices
  const getCustomerQuotes = (customerId: string) => 
    quotes.filter((q: Quote) => q.customerId === customerId).map((q: Quote) => ({
      id: q.id, quoteNumber: q.quoteNumber, total: q.total, status: q.status, createdAt: q.createdAt
    }));
  
  const getCustomerInvoices = (customerId: string) => 
    invoices.filter((i: Invoice) => i.customerId === customerId).map((i: Invoice) => ({
      id: i.id, invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, createdAt: i.createdAt
    }));

  // Handlers
  const handleSave = async (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
      } else {
        await addCustomer(data);
      }
      setEditingCustomer(null);
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu khách hàng');
      console.error('Error saving customer:', error);
    }
  };

  const handleDelete = async (customer: Customer) => {
    const hasData = quotes.some((q: Quote) => q.customerId === customer.id) || invoices.some((i: Invoice) => i.customerId === customer.id);
    if (hasData) {
      alert('Không thể xóa khách hàng này vì đã có báo giá hoặc hóa đơn liên quan.');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) {
      try {
        await deleteCustomer(customer.id);
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa khách hàng');
        console.error('Error deleting customer:', error);
      }
    }
  };

  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <BusinessHeader
        title="Khách Hàng"
        subtitle="Quản lý danh sách khách hàng"
        isLoaded={isLoaded}
        loading={loading}
        error={error}
      >
        <button
          onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
          className="bg-white text-indigo-600 px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          Thêm khách hàng
        </button>
      </BusinessHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, công ty, số điện thoại..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Tổng khách hàng</div>
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Tổng đơn hàng</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.totalOrders}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Tổng doanh thu</div>
              <div className="text-lg font-bold text-green-600">{formatVND(stats.totalSpent)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <TrendingUp size={12} className="text-amber-500" /> Khách VIP (≥10 đơn)
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.vip}</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Liên hệ</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Công ty</th>
                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase">Đơn hàng</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tổng chi tiêu</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <Users size={48} className="mx-auto mb-3 opacity-30" />
                        <p>{searchTerm ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}</p>
                        {!searchTerm && (
                          <button 
                            onClick={() => setIsModalOpen(true)}
                            className="mt-3 text-indigo-600 hover:underline"
                          >
                            Thêm khách hàng đầu tiên
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setViewingCustomer(customer)}
                            className="flex items-center gap-3 text-left hover:text-indigo-600"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              customer.totalOrders >= 20 ? 'bg-amber-100 text-amber-600' :
                              customer.totalOrders >= 10 ? 'bg-green-100 text-green-600' :
                              'bg-indigo-100 text-indigo-600'
                            }`}>
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{customer.name}</div>
                              <div className="text-xs text-slate-400">
                                Từ {formatDate(customer.createdAt)}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail size={12} className="text-slate-400" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={12} className="text-slate-400" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 size={14} className="text-slate-400" />
                            {customer.company || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            customer.totalOrders >= 20 ? 'bg-amber-100 text-amber-700' :
                            customer.totalOrders >= 10 ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {customer.totalOrders}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-slate-800">{formatVND(customer.totalSpent)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                              title="Sửa"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(customer)}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} / {filteredCustomers.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'border hover:bg-white text-slate-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        onSave={handleSave}
      />

      {/* Detail Modal */}
      <CustomerDetailModal
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
        quotes={viewingCustomer ? getCustomerQuotes(viewingCustomer.id) : []}
        invoices={viewingCustomer ? getCustomerInvoices(viewingCustomer.id) : []}
      />
    </div>
  );
};

export default CustomersPage;
