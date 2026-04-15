import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, 
  UserPlus, 
  Search, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  Briefcase,
  RefreshCw,
  Edit3,
  Trash2,
  Eye,
  Filter,
  Download,
  Upload
} from 'lucide-react';
import { useRBAC } from '../contexts/RBACContext';
import { useBranch } from '../contexts/BranchContext';
import { enquiriesService } from '../services/enquiriesService';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitization';
import { validateEmail, validatePhone, getEmailError, getPhoneError } from '../utils/validation';
import Chart from '../components/UI/Chart';

const Enquiries = () => {
  const { hasPermission } = useRBAC();
  const { currentBranch } = useBranch();
  const fileInputRef = useRef(null);
  
  const [enquiries, setEnquiries] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [importing, setImporting] = useState(false);
  
  const [formData, setFormData] = useState({
    enquiryLevel: '',
    customerName: '',
    contact: '',
    email: '',
    address: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    occupation: '',
    howDidYouKnow: '',
    packageInterestedIn: '',
    packageCost: '',
    trailGiven: 'no',
    nextFollowUp: '',
    counsellor: '',
    remark: ''
  });

  useEffect(() => {
    loadData();
  }, [currentBranch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [enquiriesData, counselorsData, packagesData] = await Promise.all([
        enquiriesService.getAllEnquiries(currentBranch?.id),
        enquiriesService.getCounselors(currentBranch?.id),
        enquiriesService.getPackages(currentBranch?.id)
      ]);
      
      setEnquiries(enquiriesData);
      const normalizedCounselors = (counselorsData || []).map(c => ({
        id: c.id || c.counselorId || c.uid || c.email || c.name,
        name: c.name || c.fullName || c.displayName || c.email || 'Unknown'
      }));
      setCounselors(normalizedCounselors);
      setPackages(packagesData);
    } catch (error) {
      // Error loading enquiries data
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let sanitizedValue = value;
    if (name === 'email') {
      sanitizedValue = sanitizeEmail(value);
    } else if (name === 'contact') {
      sanitizedValue = sanitizePhone(value);
    } else {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Auto-calculate age from date of birth
    if (name === 'dateOfBirth' && value) {
      const age = calculateAge(value);
      setFormData(prev => ({ ...prev, age }));
    }
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const handleDelete = async (enquiryId) => {
    if (window.confirm('Are you sure you want to delete this enquiry?')) {
      try {
        await enquiriesService.deleteEnquiry(enquiryId);
        loadData();
        alert('Enquiry deleted successfully!');
        alert('Enquiry deleted successfully!');
      } catch (error) {
        alert('Failed to delete enquiry. Please try again.');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N.A' || dateStr === 'N/A' || dateStr.includes('#')) return null;
    
    const str = dateStr.trim();
    
    // Handle DD/MM/YYYY HH:MM format (e.g., "12/8/25 13:23")
    const dateTimeMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if (dateTimeMatch) {
      let day = parseInt(dateTimeMatch[1]);
      let month = parseInt(dateTimeMatch[2]) - 1;
      let year = parseInt(dateTimeMatch[3]);
      const hour = parseInt(dateTimeMatch[4]);
      const minute = parseInt(dateTimeMatch[5]);
      
      if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
      return new Date(year, month, day, hour, minute);
    }
    
    // Handle DD/MM/YY or DD/MM/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    
    return null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const line = dataLines[i];
          const columns = parseCSVLine(line);
          
          // Based on your CSV structure:
          // 0-SrNo, 1-Branch, 2-Name, 3-Contact, 4-Email, 5-Address, 6-DateOfBirth, 7-Age,
          // 8-Gender, 9-Occupation, 10-EnquiryDate, 11-FollowDate, 12-PackageOffer, 13-PackageAmount,
          // 14-Reference, 15-Status, 16-Remark, 17-Councelltor, 18-CreatedBy
          
          if (columns.length < 15) {
            errors.push(`Row ${i + 2}: Insufficient columns`);
            errorCount++;
            continue;
          }

          const branch = columns[1]?.trim();
          const customerName = columns[2]?.trim();
          const contact = columns[3]?.trim();
          const email = columns[4]?.trim();
          const address = columns[5]?.trim();
          const dateOfBirth = columns[6]?.trim();
          const age = columns[7]?.trim();
          const gender = columns[8]?.trim();
          const occupation = columns[9]?.trim();
          const enquiryDate = columns[10]?.trim();
          const followDate = columns[11]?.trim();
          const packageOffer = columns[12]?.trim();
          const packageAmount = columns[13]?.trim();
          const reference = columns[14]?.trim();
          const status = columns[15]?.trim();
          const remark = columns[16]?.trim();
          const counsellor = columns[17]?.trim();
          const createdBy = columns[18]?.trim();

          if (!customerName || !contact) {
            errors.push(`Row ${i + 2}: Missing name or contact`);
            errorCount++;
            continue;
          }

          // Parse dates
          const dobObj = parseDate(dateOfBirth);
          const enquiryDateObj = parseDate(enquiryDate) || new Date();
          const followDateObj = parseDate(followDate);

          const enquiryData = {
            customerName: customerName,
            contact: contact,
            email: email || '',
            address: address || '',
            dateOfBirth: dobObj,
            age: age || '',
            gender: gender?.toLowerCase() || 'male',
            occupation: occupation || '',
            howDidYouKnow: reference || 'News paper',
            packageInterestedIn: packageOffer || '',
            packageCost: packageAmount || '',
            counsellor: counsellor || '',
            remark: remark || '',
            enquiryLevel: 'warm',
            trailGiven: 'no',
            branchId: currentBranch?.id,
            enquiryDate: enquiryDateObj,
            nextFollowUp: followDateObj,
            status: status?.toLowerCase() || 'pending',
            createdBy: createdBy || 'Import',
            createdAt: enquiryDateObj
          };

          await enquiriesService.addEnquiry(enquiryData);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      await loadData();
      alert(`Import completed!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert('Failed to import file. Please check the format and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handlePackageChange = (e) => {
    const packageName = e.target.value;
    const selectedPackage = packages.find(p => p.name === packageName);
    
    setFormData(prev => ({
      ...prev,
      packageInterestedIn: packageName,
      packageCost: selectedPackage ? selectedPackage.price.toString() : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number if provided
    if (formData.contact) {
      const phoneError = getPhoneError(formData.contact);
      if (phoneError) {
        alert(phoneError);
        return;
      }
    }

    // Validate email if provided
    if (formData.email) {
      const emailError = getEmailError(formData.email);
      if (emailError) {
        alert(emailError);
        return;
      }
    }
    
    try {
      setLoading(true);
      
      const enquiryData = {
        ...formData,
        branchId: currentBranch?.id,
        enquiryDate: new Date(),
        status: 'pending',
        createdAt: new Date()
      };
      
      await enquiriesService.addEnquiry(enquiryData);
      
      // Reload data first to ensure new enquiry appears
      await loadData();
      
      setShowAddModal(false);
      resetForm();
      
      alert('Enquiry added successfully!');
      alert('Enquiry added successfully!');
    } catch (error) {
      alert('Failed to add enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      enquiryLevel: '',
      customerName: '',
      contact: '',
      email: '',
      address: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      occupation: '',
      howDidYouKnow: '',
      packageInterestedIn: '',
      packageCost: '',
      trailGiven: 'no',
      nextFollowUp: '',
      counsellor: '',
      remark: ''
    });
  };

  const handleExport = () => {
    const dataToExport = filteredEnquiries.map(enquiry => ({
      'Enquiry Date': new Date(enquiry.enquiryDate?.toDate()).toLocaleDateString(),
      'Customer Name': enquiry.customerName,
      'Contact': enquiry.contact,
      'Email': enquiry.email,
      'Package Interested In': enquiry.packageInterestedIn,
      'Counsellor': enquiry.counsellor,
      'Status': enquiry.status,
      'Next Follow Up': enquiry.nextFollowUp ? new Date(enquiry.nextFollowUp?.toDate()).toLocaleDateString() : '-',
    }));

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(dataToExport[0]).join(",") + "\n"
      + dataToExport.map(e => Object.values(e).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "enquiries.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEnquiries = enquiries.filter(enquiry => {
    const matchesSearch = enquiry.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enquiry.contact?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || enquiry.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getEnquiryStatusData = () => {
    const statusCounts = filteredEnquiries.reduce((acc, enquiry) => {
      acc[enquiry.status] = (acc[enquiry.status] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          label: 'Enquiry Status',
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
        },
      ],
    };
  };

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Enquiries Management</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">Track and manage customer enquiries</p>
        </div>
        
        <div className="flex flex-wrap gap-2 lg:gap-3">
          <button 
            className="px-3 py-2 lg:px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            className="px-3 py-2 lg:px-4 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Enquiry</span>
          </button>
          <button
            className="px-3 py-2 lg:px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload size={16} className={importing ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import CSV'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            className="px-3 py-2 lg:px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            onClick={handleExport}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="followup">Follow Up</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {filteredEnquiries.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-gray-400 mb-2">No enquiries found</div>
              </div>
            ) : (
              filteredEnquiries.map((enquiry) => (
                <div key={enquiry.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{enquiry.customerName}</div>
                      <div className="text-xs text-gray-500">{new Date(enquiry.enquiryDate?.toDate()).toLocaleDateString()}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      enquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      enquiry.status === 'followup' ? 'bg-blue-100 text-blue-800' :
                      enquiry.status === 'converted' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {enquiry.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="block text-xs text-gray-400">Contact</span>
                      {enquiry.contact}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Package</span>
                      {enquiry.packageInterestedIn}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Follow Up</span>
                      {enquiry.nextFollowUp ? new Date(enquiry.nextFollowUp?.toDate()).toLocaleDateString() : '-'}
                    </div>
                     <div>
                      <span className="block text-xs text-gray-400">Counsellor</span>
                      {enquiry.counsellor || '-'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                     <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2" title="View">
                      <Eye size={16} /> View
                    </button>
                    <button className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-2" title="Edit">
                      <Edit3 size={16} /> Edit
                    </button>
                    <button 
                      className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" 
                      title="Delete" 
                      onClick={() => handleDelete(enquiry.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counsellor</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <p className="text-gray-600 text-sm">Loading enquiries...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">
                      No enquiries found
                    </td>
                  </tr>
                ) : (
                  filteredEnquiries.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-gray-50">
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">{new Date(enquiry.enquiryDate?.toDate()).toLocaleDateString()}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm font-medium text-gray-900">{enquiry.customerName}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">{enquiry.contact}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">{enquiry.packageInterestedIn}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">{enquiry.counsellor || '-'}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          enquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          enquiry.status === 'followup' ? 'bg-blue-100 text-blue-800' :
                          enquiry.status === 'converted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enquiry.status}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">{enquiry.nextFollowUp ? new Date(enquiry.nextFollowUp?.toDate()).toLocaleDateString() : '-'}</td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-1 lg:gap-2">
                          <button className="p-1.5 lg:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 lg:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                            <Edit3 size={14} />
                          </button>
                          <button className="p-1.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete" onClick={() => handleDelete(enquiry.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      </div>

      {/* Enquiry Stats Chart */}
      <div className="bg-white rounded-xl shadow p-3 border border-gray-200">
        <Chart data={getEnquiryStatusData()} />
      </div>

      {/* Add Enquiry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Add New Enquiry</h2>
              <button className="text-gray-400 hover:text-gray-600 text-3xl leading-none" onClick={() => setShowAddModal(false)}>x</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                Field marked with <span className="text-red-600 font-semibold">*</span> is mandatory.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enquiry Level <span className="text-red-600">*</span></label>
                  <select
                    name="enquiryLevel"
                    value={formData.enquiryLevel}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Enquiry Level</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    name="customerName"
                    placeholder="Customer Name"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact <span className="text-red-600">*</span></label>
                  <input
                    type="tel"
                    name="contact"
                    placeholder="Contact Number"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="text"
                    name="age"
                    placeholder="Age"
                    value={formData.age}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-600">*</span></label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
                  <div className="flex flex-wrap gap-4">
                    {['Professional', 'Business', 'Service', 'Homemaker', 'Student', 'Other'].map(occ => (
                      <label key={occ} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="occupation"
                          value={occ.toLowerCase()}
                          checked={formData.occupation === occ.toLowerCase()}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        {occ}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">How did you get to know about us?</label>
                  <div className="flex flex-wrap gap-4">
                    {['News paper', 'Hoarding', 'Family', 'Friends', 'Pamphlet', 'Old Member', 'Our Member', 'Just Dial', 'Social Media', 'Google Search', 'SMS', 'Email', 'Google Ads', 'Walk In', 'Talk-In', 'Facebook', 'Website', 'Bada E-Commerce', 'Other', 'Instagram'].map(source => (
                      <label key={source} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="howDidYouKnow"
                          value={source.toLowerCase()}
                          checked={formData.howDidYouKnow === source.toLowerCase()}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        {source}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Interested In</label>
                  <select
                    name="packageInterestedIn"
                    value={formData.packageInterestedIn}
                    onChange={handlePackageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Membership</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.name}>
                        {pkg.name} - INR {pkg.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Cost</label>
                  <input
                    type="text"
                    name="packageCost"
                    placeholder="Package Cost"
                    value={formData.packageCost}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trail Given?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="trailGiven"
                        value="yes"
                        checked={formData.trailGiven === 'yes'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="trailGiven"
                        value="no"
                        checked={formData.trailGiven === 'no'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow Up / Starting From <span className="text-red-600">*</span></label>
                  <input
                    type="datetime-local"
                    name="nextFollowUp"
                    value={formData.nextFollowUp}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Counsellor <span className="text-red-600">*</span></label>
                  <select
                    name="counsellor"
                    value={formData.counsellor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Counsellor*</option>
                    {counselors.map(counselor => (
                      <option key={counselor.id} value={counselor.name}>
                        {counselor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {['Not Interested', 'dingling', 'Switch off', 'Busy on call', 'incoming Services Unavailable', 
                      'Join Other Gym', 'Join After Some Days', 'Very Late', 'Not satisfied with equipments', 
                      'Not satisfied With trainers', 'Seem Not Available', 'unfitgym / not clean', 'out of town'].map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                  <textarea
                    name="remark"
                    placeholder="Remark"
                    value={formData.remark}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button type="button" className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enquiries;



