import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X,
  Filter,
  AlertTriangle,
  Upload,
  Download,
  Gift,
  History,
  Clock,
  CreditCard,
  Dumbbell,
  Package,
  Copy,
  Merge,
  UserX
} from 'lucide-react';
import { membersService } from '../services/membersService';
import { couponsService } from '../services/couponsService';
import { packagesService } from '../services/packagesService';
import { counselorsService } from '../services/counselorsService';
import { trainersService } from '../services/trainersService';
import { useBranch } from '../contexts/BranchContext';
import { useRBAC } from '../contexts/RBACContext';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitization';
import { validateEmail, validatePhone, getEmailError, getPhoneError, validatePositiveNumber, getNumberError } from '../utils/validation';
import { auth } from '../services/firebase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

const ExistingCouponsList = ({ memberId, refreshTrigger }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (memberId) {
      fetchCoupons();
    }
  }, [memberId, refreshTrigger]);

  const fetchCoupons = async () => {
    setLoading(true);
    const res = await couponsService.getMemberCoupons(memberId);
    if (res.success) {
      setCoupons(res.data);
    }
    setLoading(false);
  };
  
  if (loading) return <div className="text-center py-2 text-sm text-gray-500">Loading coupons...</div>;
  if (coupons.length === 0) return <div className="text-center py-2 text-sm text-gray-500">No coupons assigned yet.</div>;
  
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
      {coupons.map(coupon => (
        <div key={coupon.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm">
           <div>
             <div className="font-semibold text-gray-800 tracking-wide">{coupon.code}</div>
             <div className="text-xs text-gray-500">{coupon.description}</div>
           </div>
           <div className="text-right">
             <div className="font-medium text-green-600">
                {coupon.discountType === 'fixed' ? 'INR ' : ''}{coupon.discountAmount}{coupon.discountType === 'percentage' ? '%' : ''} OFF
             </div>
             <div className={`text-xs ${
               coupon.isRedeemed ? 'text-gray-400' : 
               (coupon.expiresAt && new Date(coupon.expiresAt) < new Date() ? 'text-red-400' : 'text-green-500 font-medium')
             }`}>
                {coupon.isRedeemed ? 'Redeemed' : (coupon.expiresAt && new Date(coupon.expiresAt) < new Date() ? 'Expired' : 'Active')}
             </div>
           </div>
        </div>
      ))}
    </div>
  );
};

const Members = () => {
  const { currentBranch, branches, loadBranches } = useBranch();
  const { hasPermission, isOwner } = useRBAC();
  const fileInputRef = useRef(null);
  
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replaceImport, setReplaceImport] = useState(false);
  const [lastImportErrors, setLastImportErrors] = useState([]);
  const [updateOnDuplicate, setUpdateOnDuplicate] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Form state matching the Fitomatic layout from screenshots
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    email: '',
    emergencyContact: '',
    selectGender: 'Male',
    selectStatus: 'Active',
    selectRelation: 'Father',
    dateOfBirth: '',
    age: '',
    address: '',
    membershipType: 'Select Membership',
    selectedPackage: '',
    membershipCost: '',
    discount: '',
    amountToBePaid: '',
    paymentReceived: '',
    selectPaymentMode: 'Cash',
    transactionId: '',
    nextPaymentDate: '',
    balance: '',
    memberJoiningFrom: '',
    expireOn: '',
    selectCounsellor: 'Select Counsellor',
    selectTrainer: 'Select Trainer',
    admissionFees: '',
    totalAmountReceived: '',
    selectWorkout: 'Select Workout',
    selectWorkoutLevel: 'Select Workout Level',
    remarks: ''
  });

  const [doc1File, setDoc1File] = useState(null);
  const [doc2File, setDoc2File] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Coupon State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponTargetMember, setCouponTargetMember] = useState(null);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    description: '',
    discount: '',
    discountType: 'percentage', // percentage or fixed
    expiresAt: ''
  });
  const [couponSaving, setCouponSaving] = useState(false);

  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMember, setHistoryMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState('subscriptions'); // subscriptions, payments, pt, services, attendance

  // Duplicate detection states
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [mergingMembers, setMergingMembers] = useState(false);

  // New state for table functionality
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10);

  useEffect(() => {
    loadPackages();
    if (currentBranch) {
      loadCounselors();
      loadTrainers();
    }
  }, [currentBranch]);

  const loadCounselors = async () => {
    if (!currentBranch) return;
    try {
      const result = await counselorsService.getAllCounselors(currentBranch.id);
      if (result.success) {
        setCounselors(result.data.filter(c => c.status === 'Active') || []);
      }
    } catch (err) {
      // Error loading counselors
    }
  };

  const loadTrainers = async () => {
    if (!currentBranch) return;
    try {
      const result = await trainersService.getAllTrainers(currentBranch.id);
      if (result.success) {
        setTrainers(result.data.filter(t => t.status === 'Active') || []);
      }
    } catch (err) {
      // Error loading trainers
    }
  };

  const loadMembers = useCallback(async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const result = await membersService.getAllMembers(currentBranch.id);
      if (result.success) {
        setMembers(result.data || []);
      } else {
        setError('Failed to load members');
      }
    } catch (err) {
      setError('Error loading members: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentBranch]);

  useEffect(() => {
    if (currentBranch) {
      loadMembers();
    }
  }, [currentBranch, loadMembers]);

  const loadPackages = async () => {
    try {
      const result = await packagesService.getActivePackages();
      if (result.success) {
        setPackages(result.data);
      } else {
        setPackages(result.data || []); // Fallback data
      }
    } catch (err) {
      setPackages([]);
    }
  };

  // Calculate expiration date based on joining date and package duration
  const calculateExpiryDate = (joiningDate, packageDuration) => {
    if (!joiningDate || !packageDuration) return '';
    
    const startDate = new Date(joiningDate);
    const months = parseInt(packageDuration.months) || 0;
    const days = parseInt(packageDuration.days) || 0;
    
    // Add months
    startDate.setMonth(startDate.getMonth() + months);
    // Add days
    startDate.setDate(startDate.getDate() + days);
    
    return startDate.toISOString().split('T')[0];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitize input based on field type
    let sanitizedValue = value;
    if (name === 'email') {
      sanitizedValue = sanitizeEmail(value) || value;
    } else if (name === 'contact' || name === 'emergencyContact') {
      sanitizedValue = sanitizePhone(value);
    } else if (['firstName', 'lastName', 'address', 'selectRelation'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Auto-calculate age from date of birth
    if (name === 'dateOfBirth' && value) {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        setFormData(prev => ({ ...prev, age: (age - 1).toString() }));
      } else {
        setFormData(prev => ({ ...prev, age: age.toString() }));
      }
    }

    // Auto-calculate expiry date when joining date changes
    if (name === 'memberJoiningFrom' && value && selectedPackage?.duration) {
      const expiryDate = calculateExpiryDate(value, selectedPackage.duration);
      setFormData(prev => ({ ...prev, expireOn: expiryDate }));
    }

    // Handle package selection
    if (name === 'selectedPackage') {
      handlePackageSelection(value);
    }

    // Recalculate pricing when discount changes - pass the new discount value
    if (name === 'discount' && selectedPackage) {
      const discountValue = parseFloat(sanitizedValue) || 0;
      calculatePricingForPackage(selectedPackage, discountValue);
    }

    // Recalculate balance when payment received or admission fees change
    if ((name === 'paymentReceived' || name === 'admissionFees') && formData.amountToBePaid) {
      setTimeout(() => {
        const amountToBePaid = parseFloat(formData.amountToBePaid) || 0;
        const admissionFees = name === 'admissionFees' ? (parseFloat(sanitizedValue) || 0) : (parseFloat(formData.admissionFees) || 0);
        const paymentReceived = name === 'paymentReceived' ? (parseFloat(sanitizedValue) || 0) : (parseFloat(formData.paymentReceived) || 0);
        
        const actualAmountToBePaid = Math.max(0, amountToBePaid - admissionFees);
        const balance = Math.max(0, actualAmountToBePaid - paymentReceived);
        const totalReceived = admissionFees + paymentReceived;
        
        setFormData(prev => ({
          ...prev,
          balance: balance.toString(),
          totalAmountReceived: totalReceived.toString()
        }));
      }, 0);
    }
  };

  const handlePackageSelection = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setSelectedPackage(pkg);
      
      // Calculate expiry date if joining date is already set
      const expiryDate = formData.memberJoiningFrom && pkg.duration 
        ? calculateExpiryDate(formData.memberJoiningFrom, pkg.duration)
        : '';
      
      setFormData(prev => ({
        ...prev,
        selectedPackage: packageId,
        membershipType: pkg.packageName,
        membershipCost: pkg.price.toString(),
        discount: '',
        expireOn: expiryDate
      }));
      calculatePricingForPackage(pkg, 0);
    } else {
      setSelectedPackage(null);
      setFormData(prev => ({
        ...prev,
        selectedPackage: '',
        membershipType: 'Select Membership',
        membershipCost: '',
        discount: '',
        amountToBePaid: '',
        balance: ''
      }));
    }
  };

  const calculatePricingForPackage = (pkg, discountAmountOverride = null) => {
    if (!pkg) return;

    const basePrice = parseFloat(pkg.price) || 0;
    const discountAmount = discountAmountOverride !== null ? discountAmountOverride : (parseFloat(formData.discount) || 0);
    const maxDiscount = parseFloat(pkg.maxDiscount) || 0;
    
    // Ensure discount doesn't exceed max allowed discount
    const actualDiscount = Math.min(discountAmount, maxDiscount);
    
    // Calculate final price
    const finalPrice = Math.max(0, basePrice - actualDiscount);
    const paymentReceived = parseFloat(formData.paymentReceived) || 0;
    const balance = finalPrice - paymentReceived;

    setFormData(prev => ({
      ...prev,
      membershipCost: pkg.price.toString(),
      discount: actualDiscount.toString(),
      amountToBePaid: finalPrice.toString(),
      balance: balance.toString()
    }));
  };

  const calculatePricing = () => {
    if (selectedPackage) {
      calculatePricingForPackage(selectedPackage);
    }
  };

  // Coupon Handlers
  const handleOpenCouponModal = (member) => {
    setCouponTargetMember(member);
    setCouponFormData({
      code: couponsService.generateCouponCode(), // Auto-generate code
      description: 'Special Member Discount',
      discount: '10',
      discountType: 'percentage',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // +7 days
    });
    setIsCouponModalOpen(true);
  };

  const handleCouponInputChange = (e) => {
    const { name, value } = e.target;
    setCouponFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignCoupon = async (e) => {
    e.preventDefault();
    setCouponSaving(true);
    setError('');

    try {
      if (!couponTargetMember) return;

      const result = await couponsService.assignCoupon(couponTargetMember, couponFormData);
      if (result.success) {
        setSuccess(`Coupon ${result.couponCode} assigned to ${couponTargetMember.name}!`);
        setIsCouponModalOpen(false);
        setCouponTargetMember(null);
      } else {
        setError(result.error || 'Failed to assign coupon');
      }
    } catch (err) {
      setError('Error assigning coupon: ' + err.message);
    } finally {
      setCouponSaving(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhoto(e.target.result);
      };
      reader.readAsDataURL(file);
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
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N.A' || dateStr === 'N/A') return null;
    
    const str = dateStr.trim();
    
    // Handle text format: "12 april 2026", "12 April 2026", "12-April-2026"
    const monthNames = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
    
    // Match patterns like "12 april 2026", "12-april-2026", "12/april/2026"
    const textDateMatch = str.match(/(\d{1,2})[\s\-\/]([a-zA-Z]+)[\s\-\/](\d{4})/);
    if (textDateMatch) {
      const day = parseInt(textDateMatch[1]);
      const monthStr = textDateMatch[2].toLowerCase();
      const year = parseInt(textDateMatch[3]);
      const month = monthNames[monthStr];
      
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Handle Excel serial number (days since 1900-01-01)
    const serialNum = parseFloat(str);
    if (!isNaN(serialNum) && serialNum > 1000 && serialNum < 100000) {
      // Excel date serial number
      const excelEpoch = new Date(1900, 0, 1);
      const days = serialNum - 2; // Adjust for Excel's leap year bug
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      return date;
    }
    
    // Handle DD-MM-YYYY or DD-MM-YY format
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        
        // Handle 2-digit year (e.g., 25 = 2025)
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Handle DD/MM/YYYY or DD/MM/YY format
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        
        // Handle 2-digit year (e.g., 25 = 2025, 26 = 2026)
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Try standard Date parsing as last resort
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return null;
  };

  const downloadErrorsCSV = (errors) => {
    if (!errors || errors.length === 0) return;
    const header = 'Row,Message';
    const rows = errors.map((msg) => {
      const m = String(msg);
      const match = m.match(/Row\s+(\d+):\s*(.*)/i);
      if (match) {
        const row = match[1];
        const text = match[2].replaceAll('"', '""');
        return `${row},"${text}"`;
      }
      return `,"${m.replaceAll('"', '""')}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      setImporting(true);
      // Ensure branches list is loaded before processing
      try {
        if (!branches || branches.length === 0) {
          await loadBranches();
        }
      } catch (err) {
        // Could not pre-load branches, proceeding with currentBranch fallback
      }

      // Optional: replace existing branch members before import
      if (replaceImport && currentBranch?.id) {
        const ok = window.confirm(`This will delete ALL members in branch "${currentBranch.name}" before import. Continue?`);
        if (!ok) {
          setImporting(false);
          return;
        }
        const delResult = await membersService.deleteMembersByBranch(currentBranch.id);
        if (delResult.success) {
          // Cleared existing members
        } else {
          // Failed to clear existing members
        }
      }

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
          
          if (columns.length < 18) {
            errors.push(`Row ${i + 2}: Insufficient columns`);
            errorCount++;
            continue;
          }

          // Parse CSV columns based on the structure
          const csvBranchName = columns[1]?.trim();
          const memberId = columns[2]?.trim();
          const fullName = columns[3]?.trim();
          const contact = columns[4]?.trim();
          const gender = columns[5]?.trim();
          const membershipName = columns[6]?.trim();
          // Parse numeric fields safely (strip non-digits except dot)
          const parseNum = (v) => {
            const s = (v || '').toString().replace(/[^0-9.-]/g, '');
            const n = parseFloat(s);
            return Number.isFinite(n) ? n : 0;
          };
          const membershipCost = parseNum(columns[7]?.trim());
          const amountPaid = parseNum(columns[8]?.trim());
          const discount = parseNum(columns[9]?.trim());
          const computedPending = Math.max(membershipCost - amountPaid - discount, 0);
          const startDate = columns[11]?.trim();
          const nextPayment = columns[12]?.trim();
          const expiresOn = columns[13]?.trim();
          const status = columns[14]?.trim();
          const morePaymentRequired = columns[15]?.trim();
          const counsellor = columns[16]?.trim();
          const createdBy = columns[17]?.trim();
          const remark = columns[18]?.trim() || '';

          // Handle missing name or contact - set to N/A if missing
          const finalName = fullName || 'N/A';
          const finalContact = contact || 'N/A';

          // Skip if both name and contact are missing
          if (!fullName && !contact) {
            errors.push(`Row ${i + 2}: Missing both name and contact`);
            errorCount++;
            continue;
          }



          // Map CSV branch name to branch ID
          let targetBranchId = currentBranch?.id;
          let targetBranchName = currentBranch?.name;
          
          if (csvBranchName) {
            // Normalize names to be resilient to spacing/case/parentheses
            const normalize = (s) => (s || '')
              .toLowerCase()
              .replace(/\((.*?)\)/g, '') // remove parentheses
              .replace(/[^a-z0-9]/g, ''); // strip spaces, hyphens etc

            const csvNorm = normalize(csvBranchName)
              .replace('mainbranch', 'vazirabad'); // treat main branch as Vazirabad

            const list = Array.isArray(branches) ? branches : [];
            let matchingBranch = list.find(b => {
              const bn = normalize(b.name);
              return bn === csvNorm || bn.includes(csvNorm) || csvNorm.includes(bn) ||
                     (csvNorm.includes('vazir') && bn.includes('vazir')) ||
                     (csvNorm.includes('anand') && bn.includes('anand'));
            });
            // Fallback: if still not found, try choosing best match by keywords
            if (!matchingBranch && list.length > 0) {
              if (csvNorm.includes('vazir') || csvNorm.includes('mainbranch')) {
                matchingBranch = list.find(b => normalize(b.name).includes('vazir')) || matchingBranch;
              } else if (csvNorm.includes('anand')) {
                matchingBranch = list.find(b => normalize(b.name).includes('anand')) || matchingBranch;
              }
            }
            
            if (matchingBranch) {
              targetBranchId = matchingBranch.id;
              targetBranchName = matchingBranch.name;
            } else {
              // If no branch match found, log warning but use current branch
            }
          }

          // Check for duplicate phone number in existing members in the SAME branch only
          // Note: Server enforces per-branch duplicate check; this is just a fast client hint
          if (finalContact !== 'N/A' && targetBranchId === currentBranch?.id) {
            const existingMemberByPhone = members.find(m => m.phone === finalContact || m.contact === finalContact);
            if (existingMemberByPhone) {
              errors.push(`Row ${i + 2}: Phone number ${finalContact} already exists for member ${existingMemberByPhone.name}`);
              errorCount++;
              continue;
            }
          }

          // Split full name into first and last name
          const nameParts = (finalName || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Parse dates
          const startDateObj = parseDate(startDate);
          const expiresOnObj = parseDate(expiresOn);
          const nextPaymentObj = parseDate(nextPayment);

          const memberData = {
            // Required fields for membersService
            name: finalName,
            phone: finalContact,
            memberJoiningFrom: targetBranchName || csvBranchName || 'Import',
            
            // Old system fields - store everything from CSV
            srNo: columns[0]?.trim() || '',
            branch: csvBranchName || targetBranchName,
            memberId: memberId || `VGM${Date.now()}`,
            memberName: finalName,
            
            // Standard fields
            firstName: firstName,
            lastName: lastName,
            contact: finalContact,
            email: '',
            emergencyContact: '',
            selectGender: gender || 'Male',
            selectStatus: status === 'Active' ? 'Active' : 'InActive',
            status: status === 'Active' ? 'Active' : 'InActive',
            selectRelation: 'Father',
            dateOfBirth: null,
            age: '',
            address: '',
            
            // Membership fields from CSV
            membershipType: membershipName || '',
            selectedPackage: membershipName || '',
            membershipName: membershipName || '',
            membershipCost: membershipCost,
            amountToBePaid: computedPending,
            amountPaid: amountPaid,
            paymentReceived: amountPaid,
            discount: discount,
            balanceAmount: computedPending,
            balance: computedPending.toString(),
            morePaymentRequired: morePaymentRequired === 'Yes' ? 'Yes' : 'No',
            
            // Date fields
            nextPaymentDate: nextPaymentObj,
            startDate: startDateObj || new Date(),
            endDate: expiresOnObj || new Date(),
            joinDate: startDateObj || new Date(),
            expiryDate: expiresOnObj || new Date(),
            expiresOn: expiresOn,
            
            // Additional fields
            assignCounselor: counsellor || '',
            counsellor: counsellor || '',
            assignTrainer: '',
            healthIssues: remark,
            remarks: remark,
            receiptNo: '',
            notes: remark,
            
            // System fields - use mapped branch ID
            branchId: targetBranchId,
            createdBy: createdBy || auth.currentUser?.email || 'Import',
            createdAt: new Date(),
            updatedAt: new Date(),
            
            // Import tracking
            importedFrom: 'CSV',
            importDate: new Date()
          };

          const result = await membersService.addMember(memberData);
          
          if (result.success) {
            successCount++;
          } else {
            // If duplicate and update mode enabled, attempt an update instead of skipping
            if (updateOnDuplicate && /already exists in this branch/i.test(result.error) && finalContact !== 'N/A' && targetBranchId) {
              try {
                const lookup = await membersService.findMemberByPhoneInBranch(targetBranchId, finalContact);
                if (lookup.success && lookup.data?.id) {
                  // For safety, do not overwrite createdAt; update selective fields
                  const updatePayload = {
                    name: memberData.name,
                    email: memberData.email,
                    membershipType: memberData.membershipType,
                    selectedPackage: memberData.selectedPackage,
                    membershipName: memberData.membershipName,
                    membershipCost: memberData.membershipCost,
                    amountToBePaid: memberData.amountToBePaid,
                    amountPaid: memberData.amountPaid,
                    discount: memberData.discount,
                    balanceAmount: memberData.balanceAmount,
                    nextPaymentDate: memberData.nextPaymentDate,
                    startDate: memberData.startDate,
                    endDate: memberData.endDate,
                    joinDate: memberData.joinDate,
                    expiryDate: memberData.expiryDate,
                    status: memberData.status,
                    counsellor: memberData.counsellor,
                    notes: memberData.notes,
                  };
                  const upd = await membersService.updateMember(lookup.data.id, updatePayload);
                  if (upd.success) {
                    successCount++;
                    continue;
                  }
                }
              } catch (updErr) {
                // Update failed
              }
            }
            errors.push(`Row ${i + 2}: ${result.error}`);
            errorCount++;
          }
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error.message}`);
          errorCount++;
        }
      }

      await loadMembers();
      
      let message = `Import completed!\nSuccess: ${successCount}\nErrors: ${errorCount}`;
      if (errors.length > 0 && errors.length <= 10) {
        message += '\n\nFirst errors:\n' + errors.slice(0, 10).join('\n');
      }
      
      setSuccess(message);
      setLastImportErrors(errors);
      if (errors.length > 0) {
        // Auto-download error CSV summary
        downloadErrorsCSV(errors);
      }
      setTimeout(() => setSuccess(''), 5000);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError('Failed to import file. Please check the format and try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    if (filteredMembers.length === 0) {
      setError('No members to export');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const csvHeaders = [
        'Sr No', 'Branch', 'Member ID', 'Member Name', 'Contact', 'Gender',
        'Membership Name', 'Membership Cost', 'Amount To Be Paid', 'Discount',
        'Balance Amount', 'Start Date', 'Next Payment', 'Expires On', 'Status',
        'More Payment Required', 'Counsellor', 'Created By', 'Remark'
      ];

      const csvData = filteredMembers.map((member, index) => {
        const startDate = member.startDate ? new Date(member.startDate).toLocaleDateString('en-GB') : '';
        const expiresOn = member.endDate || member.expiryDate ? 
          new Date(member.endDate || member.expiryDate).toLocaleDateString('en-GB') : '';
        const nextPayment = member.nextPaymentDate ? 
          new Date(member.nextPaymentDate).toLocaleDateString('en-GB') : 'N.A';

        return [
          index + 1,
          member.branch || currentBranch?.name || '',
          member.memberId || member.id || '',
          member.memberName || member.name || `${member.firstName} ${member.lastName}`.trim(),
          member.contact || member.phone || '',
          member.selectGender || member.gender || '',
          member.membershipName || member.membershipType || member.selectedPackage || '',
          member.membershipCost || '0',
          member.amountToBePaid || '0',
          member.discount || '0',
          member.balanceAmount || '0',
          startDate,
          nextPayment,
          expiresOn,
          member.status || member.selectStatus || 'Active',
          member.morePaymentRequired || 'No',
          member.counsellor || member.assignCounselor || '',
          member.createdBy || '',
          member.remarks || member.healthIssues || ''
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => {
          const cellStr = String(cell || '');
          // Escape quotes and wrap in quotes if contains comma
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('Members exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to export members. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleExportExcel = () => {
    if (filteredMembers.length === 0) {
      setError('No members to export');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      const rows = filteredMembers.map((m, idx) => ({
        SrNo: idx + 1,
        Branch: currentBranch?.name || '',
        MemberID: m.memberId || m.id,
        Name: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
        Contact: m.phone || m.contact || '',
        Gender: m.selectGender || '',
        Membership: m.membershipName || m.membershipType || '',
        Cost: m.membershipCost || 0,
        AmountToBePaid: m.amountToBePaid || 0,
        Discount: m.discount || 0,
        Balance: parseFloat(m.balance) || m.balanceAmount || 0,
        StartDate: m.startDate || '',
        NextPayment: m.nextPaymentDate || '',
        ExpiresOn: m.expiryDate || '',
        Status: m.status || '',
        Counselor: m.counsellor || m.assignCounselor || '',
        Remark: m.remarks || m.notes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      XLSX.writeFile(wb, `Members-${currentBranch?.name || 'All'}.xlsx`);
    } catch (err) {
      // Excel export failed
      setError('Failed to export Excel');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Permission check
    if (editingMember && !canEdit) {
      setError('You do not have permission to edit members');
      return;
    }
    if (!editingMember && !canAdd) {
      setError('You do not have permission to add members');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Combine first and last name
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      if (!fullName || !formData.contact || !formData.memberJoiningFrom) {
        setError('Please fill in all required fields (Name, Contact, and Member Joining From)');
        setLoading(false);
        return;
      }

      // Validate email if provided
      if (formData.email) {
        const emailError = getEmailError(formData.email);
        if (emailError) {
          setError(emailError);
          setLoading(false);
          return;
        }
      }

      // Validate phone number
      const phoneError = getPhoneError(formData.contact);
      if (phoneError) {
        setError(phoneError);
        setLoading(false);
        return;
      }

      // Calculate proper amounts considering admission fees
      const admissionFees = parseFloat(formData.admissionFees) || 0;
      const paymentReceived = parseFloat(formData.paymentReceived) || 0;
      const amountToBePaid = parseFloat(formData.amountToBePaid) || 0;
      
      // Validate numeric fields
      if (amountToBePaid < 0) {
        setError('Amount to be paid cannot be negative');
        setLoading(false);
        return;
      }

      if (paymentReceived < 0) {
        setError('Payment received cannot be negative');
        setLoading(false);
        return;
      }
      
      // Deduct admission fees from the total amount to be paid
      const actualAmountToBePaid = Math.max(0, amountToBePaid - admissionFees);
      const balance = Math.max(0, actualAmountToBePaid - paymentReceived);
      const totalReceived = admissionFees + paymentReceived;

      // Get counselor and trainer IDs
      const counselorId = formData.selectCounsellor && formData.selectCounsellor !== 'Select Counsellor' 
        ? formData.selectCounsellor 
        : null;
      
      const trainerId = formData.selectTrainer && formData.selectTrainer !== 'Select Trainer'
        ? formData.selectTrainer
        : null;

      // Lookup names for legacy/display support
      const counselorName = counselorId ? counselors.find(c => c.id === counselorId)?.name : null;
      const trainerName = trainerId ? trainers.find(t => t.id === trainerId)?.name : null;

      // Parse numeric values properly
      const memberData = {
        ...formData,
        name: fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.contact,
        contact: formData.contact,
        branchId: currentBranch?.id,
        photo: profilePhoto,
        doc1: doc1File,
        doc2: doc2File,
        // Tracking fields
        counselorId: counselorId,
        counselorName: counselorName,
        selectCounsellor: counselorId, // Store ID for form consistency
        trainerId: trainerId,
        trainerName: trainerName,
        selectTrainer: trainerId, // Store ID for form consistency
        addedBy: auth.currentUser?.email || auth.currentUser?.uid,
        addedByName: auth.currentUser?.displayName || auth.currentUser?.email,
        // Ensure discount values are saved as numbers
        discount: parseFloat(formData.discount) || 0,
        membershipCost: parseFloat(formData.membershipCost) || 0,
        amountToBePaid: actualAmountToBePaid,
        paymentReceived: paymentReceived,
        balance: balance,
        admissionFees: admissionFees,
        totalAmountReceived: totalReceived,
        age: parseInt(formData.age) || 0,
        status: formData.selectStatus || 'Active'
      };

      let result;
      
      if (editingMember) {
        // Update existing member
        memberData.updatedAt = new Date();
        result = await membersService.updateMember(editingMember.id, memberData);
        
        if (result.success) {
          // Handle counselor change
          const oldCounselorId = editingMember.counselorId;
          if (oldCounselorId !== counselorId) {
            // Decrement old counselor's count
            if (oldCounselorId) {
              await counselorsService.decrementMemberCount(oldCounselorId);
            }
            // Increment new counselor's count
            if (counselorId) {
              await counselorsService.incrementMemberCount(counselorId);
            }
          }
          
          // Handle trainer change
          const oldTrainerId = editingMember.trainerId;
          if (oldTrainerId !== trainerId) {
            // Decrement old trainer's count
            if (oldTrainerId) {
              await trainersService.decrementMemberCount(oldTrainerId);
            }
            // Increment new trainer's count
            if (trainerId) {
              await trainersService.incrementMemberCount(trainerId);
            }
          }
          
          setSuccess('Member updated successfully!');
        } else {
          setError(result.error || 'Failed to update member');
        }
      } else {
        // Add new member
        memberData.createdAt = new Date();
        result = await membersService.addMember(memberData);
        
        if (result.success) {
          // Increment counselor member count
          if (counselorId) {
            await counselorsService.incrementMemberCount(counselorId);
          }
          
          // Increment trainer member count
          if (trainerId) {
            await trainersService.incrementMemberCount(trainerId);
          }
          
          setSuccess('Member added successfully!');
        } else {
          setError(result.error || 'Failed to add member');
        }
      }
      
      if (result.success) {
        resetForm();
        setShowAddForm(false);
        setEditingMember(null);
        loadMembers();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Error saving member: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      contact: '',
      email: '',
      emergencyContact: '',
      selectGender: 'Male',
      selectStatus: 'Active',
      selectRelation: 'Father',
      dateOfBirth: '',
      age: '',
      address: '',
      membershipType: 'Select Membership',
      selectedPackage: '',
      membershipCost: '',
      discount: '',
      amountToBePaid: '',
      paymentReceived: '',
      selectPaymentMode: 'Cash',
      transactionId: '',
      nextPaymentDate: '',
      balance: '',
      memberJoiningFrom: '',
      expireOn: '',
      selectCounsellor: 'Select Counsellor',
      selectTrainer: 'Select Trainer',
      admissionFees: '',
      totalAmountReceived: '',
      selectWorkout: 'Select Workout',
      selectWorkoutLevel: 'Select Workout Level',
      remarks: ''
    });
    setDoc1File(null);
    setDoc2File(null);
    setProfilePhoto(null);
    setSelectedPackage(null);
  };

  // Helper functions for table functionality
  const filteredMembers = members.filter(member => {
    const fullName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
    const contact = member.contact || member.phone || '';
    
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.includes(searchTerm) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || member.selectStatus === statusFilter || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  const startIndex = (currentPage - 1) * membersPerPage;
  const currentMembers = filteredMembers.slice(startIndex, startIndex + membersPerPage);

  const handleEditMember = (member) => {
    // Reload packages to ensure we have the latest list
    loadPackages();
    
    setEditingMember(member);
    
    // Split the name back into firstName and lastName if it's stored as a single name field
    const nameParts = member.name ? member.name.split(' ') : ['', ''];
    const firstName = nameParts[0] || member.firstName || '';
    const lastName = nameParts.slice(1).join(' ') || member.lastName || '';
    
    // Format dates properly
    const formatDate = (date) => {
      if (!date) return '';
      try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };
    
    setFormData({
      firstName: firstName,
      lastName: lastName,
      contact: member.phone || member.contact || '',
      email: member.email || '',
      emergencyContact: member.emergencyContact || '',
      selectGender: member.selectGender || 'Male',
      selectStatus: member.selectStatus || member.status || 'Active',
      selectRelation: member.selectRelation || 'Father',
      dateOfBirth: formatDate(member.dateOfBirth) || '',
      age: member.age !== undefined && member.age !== null ? member.age.toString() : '',
      address: member.address || '',
      membershipType: member.membershipType || 'Select Membership',
      selectedPackage: member.selectedPackage || '',
      membershipCost: member.membershipCost !== undefined && member.membershipCost !== null ? member.membershipCost.toString() : '',
      discount: member.discount !== undefined && member.discount !== null ? member.discount.toString() : '',
      amountToBePaid: member.amountToBePaid !== undefined && member.amountToBePaid !== null ? member.amountToBePaid.toString() : '',
      paymentReceived: member.paymentReceived !== undefined && member.paymentReceived !== null ? member.paymentReceived.toString() : '',
      selectPaymentMode: member.selectPaymentMode || 'Cash',
      transactionId: member.transactionId || '',
      nextPaymentDate: formatDate(member.nextPaymentDate) || '',
      balance: member.balance !== undefined && member.balance !== null ? member.balance.toString() : '',
      memberJoiningFrom: formatDate(member.memberJoiningFrom) || formatDate(member.joinDate) || '',
      expireOn: formatDate(member.expireOn) || formatDate(member.expiryDate) || '',
      selectCounsellor: member.counselorId || (member.counselorName ? counselors.find(c => c.name === member.counselorName)?.id : '') || 'Select Counsellor',
      selectTrainer: member.trainerId || (member.trainerName ? trainers.find(t => t.name === member.trainerName)?.id : '') || 'Select Trainer',
      admissionFees: member.admissionFees !== undefined && member.admissionFees !== null ? member.admissionFees.toString() : '',
      totalAmountReceived: member.totalAmountReceived !== undefined && member.totalAmountReceived !== null ? member.totalAmountReceived.toString() : '',
      selectWorkout: member.selectWorkout || 'Select Workout',
      selectWorkoutLevel: member.selectWorkoutLevel || 'Select Workout Level',
      remarks: member.remarks || ''
    });
    
    if (member.photo) {
      setProfilePhoto(member.photo);
    }
    
    // Set selected package if exists
    if (member.selectedPackage) {
      const pkg = packages.find(p => p.id === member.selectedPackage);
      if (pkg) {
        setSelectedPackage(pkg);
      }
    }
    
    setShowAddForm(true);
  };

  const handleDeleteMember = async (memberId) => {
    // Permission check
    if (!canDelete) {
      setError('You do not have permission to delete members');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      try {
        const result = await membersService.deleteMember(memberId);
        if (result.success) {
          setSuccess('Member deleted successfully');
          loadMembers();
        } else {
          setError('Failed to delete member');
        }
      } catch (err) {
        setError('Error deleting member');
      }
    }
  };

  const handleViewHistory = async (member) => {
    setHistoryMember(member);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const result = await membersService.getMemberHistory(member.id);
      if (result.success) {
        setMemberHistory(result.data);
      } else {
        setError('Failed to load member history');
        setMemberHistory(null);
      }
    } catch (err) {
      setError('Error loading member history');
      setMemberHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFindDuplicates = async () => {
    setShowDuplicatesModal(true);
    setLoadingDuplicates(true);
    
    try {
      const result = await membersService.findPotentialDuplicates();
      if (result.success) {
        setDuplicates(result.data);
      } else {
        setError('Failed to find duplicates');
        setDuplicates([]);
      }
    } catch (err) {
      setError('Error finding duplicates');
      setDuplicates([]);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleMergeMembers = async (primaryId, secondaryId) => {
    if (!window.confirm('Are you sure you want to merge these members? This will transfer all data from the secondary account to the primary account. This action cannot be undone.')) {
      return;
    }

    setMergingMembers(true);
    try {
      const result = await membersService.mergeMembers(primaryId, secondaryId);
      if (result.success) {
        setSuccess('Members merged successfully');
        // Reload duplicates to refresh the list
        await handleFindDuplicates();
        // Reload members list
        await loadMembers();
      } else {
        setError(result.error || 'Failed to merge members');
      }
    } catch (err) {
      setError('Error merging members');
    } finally {
      setMergingMembers(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
      setSelectAll(false);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
      setSelectAll(true);
    }
  };

  const handleSelectMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedMembers, memberId];
      setSelectedMembers(newSelected);
      if (newSelected.length === filteredMembers.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      setError('You do not have permission to delete members');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('No members selected');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const confirmMsg = `Are you sure you want to delete ${selectedMembers.length} member(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const memberId of selectedMembers) {
        try {
          const result = await membersService.deleteMember(memberId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      setSelectedMembers([]);
      setSelectAll(false);
      await loadMembers();

      if (errorCount === 0) {
        setSuccess(`Successfully deleted ${successCount} member(s)`);
      } else {
        setError(`Deleted ${successCount} member(s), failed to delete ${errorCount}`);
      }
      
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    } catch (error) {
      setError('Error deleting members');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingMember(null);
    resetForm();
  };

  // Permission checks
  const canView = isOwner() || hasPermission('view_members');
  const canAdd = isOwner() || hasPermission('add_members');
  const canEdit = isOwner() || hasPermission('edit_members');
  const canDelete = isOwner() || hasPermission('delete_members');

  // Access denied if no view permission
  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-red-100">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view members.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Members Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage gym members and their membership information</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {canAdd && (
            <>
              <div className="hidden md:flex items-center gap-2 mr-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceImport}
                    onChange={(e) => setReplaceImport(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Replace on Import
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" title="Update existing member if found">
                  <input
                    type="checkbox"
                    checked={updateOnDuplicate}
                    onChange={(e) => setUpdateOnDuplicate(e.target.checked)}
                     className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Update Duplicate
                </label>
              </div>

              <button 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-medium"
                onClick={() => {
                  loadPackages(); // Reload packages to get latest list
                  setShowAddForm(true);
                }}
              >
                <Plus size={18} />
                Add Member
              </button>
              
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium"
                onClick={handleImportClick}
                disabled={importing}
              >
                <Upload size={18} className={importing ? 'animate-pulse text-primary' : 'text-gray-500'} />
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
          
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium"
            onClick={handleFindDuplicates}
          >
            <Copy size={18} className="text-orange-500" />
            Find Duplicates
          </button>

          <button 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium"
            onClick={handleExport}
          >
            <Download size={18} className="text-gray-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium"
            onClick={handleExportExcel}
          >
            <Download size={18} className="text-gray-500" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {lastImportErrors.length > 0 && (
             <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all text-sm font-medium"
              onClick={() => downloadErrorsCSV(lastImportErrors)}
            >
              <AlertTriangle size={18} />
              Errors ({lastImportErrors.length})
            </button>
          )}

          {canDelete && selectedMembers.length > 0 && (
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 size={18} />
              Delete ({selectedMembers.length})
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between whitespace-pre-line">
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Branch Context */}
      {currentBranch && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="font-medium">Managing members for:</span>
            <span className="font-semibold">{currentBranch.name}</span>
          </div>
        </div>
      )}

      {/* Members Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Members</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{members.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Members</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              {members.filter(m => m.selectStatus === 'Active' || m.status === 'Active').length}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50">
            <Filter size={16} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-0 bg-transparent focus:ring-0 text-gray-700 text-sm cursor-pointer p-0 pr-8"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading members...</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden">
              {currentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center p-4">
                  <Users size={48} className="text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm || statusFilter ? 'No members match' : 'No members found'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Add your first member to get started'}
                  </p>
                  {!searchTerm && !statusFilter && (
                    <button 
                      className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus size={20} />
                      Add Member
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentMembers.map((member) => (
                    <div key={member.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => handleSelectMember(member.id)}
                            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">{member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{member.contact || member.phone || 'N/A'}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (member.selectStatus?.toLowerCase() || 'active') === 'active' ? 'bg-green-100 text-green-800' :
                          (member.selectStatus?.toLowerCase() || 'active') === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {member.selectStatus || 'Active'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 ml-8">
                        <div>
                          <span className="block text-xs text-gray-400">Membership</span>
                          {member.membershipType || 'N/A'}
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400">Join Date</span>
                          {(() => {
                            const dateValue = member.joinDate || member.startDate;
                            if (!dateValue) return 'N/A';
                            try {
                              const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
                              if (isNaN(date.getTime())) return 'Invalid Date';
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              return `${day}-${month}-${year}`;
                            } catch {
                              return 'Invalid Date';
                            }
                          })()}
                        </div>
                        <div className="col-span-2">
                          <span className="block text-xs text-gray-400">Email</span>
                          {member.email || 'N/A'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 ml-8">
                        <Link to={`/renew/${member.id}`} className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          Renew
                        </Link>
                        <button
                          onClick={() => handleViewHistory(member)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          History
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenCouponModal(member)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                          >
                            Coupon
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleEditMember(member)}
                            className="p-2 text-blue-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-2 text-red-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-max w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectAll && filteredMembers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Membership</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Join Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '400px'}}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentMembers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Users size={48} className="text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {searchTerm || statusFilter ? 'No members match your criteria' : 'No members found'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchTerm || statusFilter 
                            ? 'Try adjusting your search or filter criteria'
                            : 'Add your first member to get started'
                          }
                        </p>
                        {!searchTerm && !statusFilter && (
                          <button 
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                            onClick={() => setShowAddForm(true)}
                          >
                            <Plus size={20} />
                            Add First Member
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td data-label="Name" className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'N/A'}
                        </div>
                      </td>
                      <td data-label="Contact" className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-700">{member.contact || member.phone || 'N/A'}</div>
                      </td>
                      <td data-label="Email" className="px-6 py-4">
                        <div className="text-gray-700 max-w-[200px] truncate" title={member.email || 'N/A'}>{member.email || 'N/A'}</div>
                      </td>
                      <td data-label="Membership" className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {member.membershipType || 'N/A'}
                        </span>
                      </td>
                      <td data-label="Status" className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (member.selectStatus?.toLowerCase() || 'active') === 'active' ? 'bg-green-100 text-green-800' :
                          (member.selectStatus?.toLowerCase() || 'active') === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {member.selectStatus || 'Active'}
                        </span>
                      </td>
                      <td data-label="Join Date" className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-700">
                          {(() => {
                            const dateValue = member.joinDate || member.startDate;
                            if (!dateValue) return 'N/A';
                            try {
                              const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
                              if (isNaN(date.getTime())) return 'Invalid Date';
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              return `${day}-${month}-${year}`;
                            } catch {
                              return 'Invalid Date';
                            }
                          })()}
                        </div>
                      </td>
                      <td data-label="Actions" className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/renew/${member.id}`} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Renew Membership">
                            Renew
                          </Link>
                          <button
                            onClick={() => handleViewHistory(member)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="View History"
                          >
                            <History size={16} />
                            History
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleOpenCouponModal(member)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Gift Coupon"
                            >
                              <Gift size={16} />
                              Coupon
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleEditMember(member)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Member"
                            >
                              <Edit3 size={16} />
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          )}
                          {!canEdit && !canDelete && (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            )}
          </>
        )}
      </div>

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden mx-auto max-h-[90vh] overflow-y-auto">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                Gift Coupon to {couponTargetMember?.name ? couponTargetMember.name.split(' ')[0] : 'Member'}
              </h2>
              <button 
                onClick={() => setIsCouponModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAssignCoupon} className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    name="code"
                    value={couponFormData.code}
                    onChange={handleCouponInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono tracking-wide uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={couponFormData.description}
                    onChange={handleCouponInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="e.g. Birthday Gift"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                    <input
                      type="number"
                      name="discount"
                      value={couponFormData.discount}
                      onChange={handleCouponInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                     <select
                        name="discountType"
                        value={couponFormData.discountType}
                        onChange={handleCouponInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                     >
                       <option value="percentage">Percentage (%)</option>
                       <option value="fixed">Fixed Amount</option>
                     </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                   <input
                      type="datetime-local"
                      name="expiresAt"
                      value={couponFormData.expiresAt}
                      onChange={handleCouponInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>

                <button
                  type="submit"
                  disabled={couponSaving}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {couponSaving ? 'Assigning...' : 'Assign Coupon'}
                </button>
              </form>

              {/* List of existing coupons */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Existing Coupons</h3>
                <ExistingCouponsList memberId={couponTargetMember?.id} refreshTrigger={success} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Member Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {editingMember ? 'Edit Member' : 'Add New Member'}
                  </h2>
                  <p className="text-sm text-gray-600">Field marked with * is mandatory</p>
                  {currentBranch && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      <span className="font-medium">Branch:</span>
                      <span>{currentBranch.name}</span>
                    </div>
                  )}
                </div>
                <button onClick={cancelForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6" noValidate>
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mb-4" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200 mb-4">
                    <Users size={60} className="text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="profile-photo"
                />
                <label htmlFor="profile-photo" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm font-medium">
                  Choose Photo
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name*</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name*</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact*</label>
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Contact"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Emergency Contact"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Relation</label>
                  <select
                    name="selectRelation"
                    value={formData.selectRelation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Gender</label>
                  <select
                    name="selectGender"
                    value={formData.selectGender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Status*</label>
                  <select
                    name="selectStatus"
                    value={formData.selectStatus}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Age"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    readOnly
                  />
                </div>
              </div>

              {/* Address Row */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* File Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doc 1 (Only PNG or JPEG)</label>
                  <div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'doc1')}
                      className="hidden"
                      id="doc1"
                    />
                    <label htmlFor="doc1" className="block w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors">
                      <span className="text-sm text-gray-600">{doc1File ? doc1File.name : 'Choose File No file chosen.'}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doc 2</label>
                  <div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'doc2')}
                      className="hidden"
                      id="doc2"
                    />
                    <label htmlFor="doc2" className="block w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors">
                      <span className="text-sm text-gray-600">{doc2File ? doc2File.name : 'Choose File No file chosen.'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Membership Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
                  <select
                    name="selectedPackage"
                    value={formData.selectedPackage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="">Select Package</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.packageName} - INR {pkg.price?.toLocaleString('en-IN') || 0} ({pkg.packageType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Type</label>
                  <input
                    type="text"
                    value={selectedPackage?.packageType || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                    readOnly
                    placeholder="Select a package"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Cost</label>
                  <input
                    type="text"
                    name="membershipCost"
                    value={formData.membershipCost}
                    onChange={handleInputChange}
                    placeholder="Package Cost"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount</label>
                  <input
                    type="text"
                    value={selectedPackage?.maxDiscount ? `INR ${selectedPackage.maxDiscount?.toLocaleString('en-IN')}` : ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                    readOnly
                    placeholder="Select a package"
                  />
                </div>
              </div>

              {/* Package Information */}
              {selectedPackage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Duration:</label>
                      <span className="ml-2 text-gray-900">
                        {selectedPackage.duration?.months || 0} months, {selectedPackage.duration?.days || 0} days
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Incentive:</label>
                      <span className="ml-2 text-gray-900">{selectedPackage.incentivePercent}%</span>
                    </div>
                    {selectedPackage.details && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Details:</label>
                        <span className="ml-2 text-gray-900">{selectedPackage.details}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount (INR)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="Enter discount amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max={selectedPackage?.maxDiscount || 999999}
                  step="1"
                />
                {selectedPackage?.maxDiscount && (
                  <small className="text-xs text-gray-600 mt-1 block">
                    Maximum discount allowed: INR {selectedPackage.maxDiscount.toLocaleString('en-IN')}
                  </small>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Amount</label>
                <input
                  type="text"
                  name="amountToBePaid"
                  value={formData.amountToBePaid}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                  readOnly
                  placeholder="Final amount after discount"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Received</label>
                  <input
                    type="number"
                    name="paymentReceived"
                    value={formData.paymentReceived}
                    onChange={(e) => {
                      const payment = parseFloat(e.target.value) || 0;
                      const finalAmount = parseFloat(formData.amountToBePaid) || 0;
                      const balance = finalAmount - payment;
                      
                      setFormData(prev => ({
                        ...prev,
                        paymentReceived: e.target.value,
                        balance: balance.toString()
                      }));
                    }}
                    placeholder="Payment Received"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Mode *</label>
                  <select
                    name="selectPaymentMode"
                    value={formData.selectPaymentMode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Id</label>
                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleInputChange}
                  placeholder="Transaction Id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Payment Date{parseFloat(formData.balance) > 0 ? '*' : ''}</label>
                  <input
                    type="date"
                    name="nextPaymentDate"
                    value={formData.nextPaymentDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required={parseFloat(formData.balance) > 0}
                  />
                  {parseFloat(formData.balance) > 0 && formData.nextPaymentDate && (
                    <small className="text-xs text-blue-600 mt-1 block">
                      Payment due date for remaining balance
                    </small>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
                  <input
                    type="text"
                    name="balance"
                    value={formData.balance}
                    onChange={handleInputChange}
                    placeholder="Balance"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                    readOnly
                  />
                </div>
              </div>

              {/* Balance Alert */}
              {parseFloat(formData.balance) > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <strong className="text-yellow-900 font-semibold">Payment Pending!</strong>
                      <p className="text-yellow-800 mt-1">
                        Remaining Balance: <strong>INR {parseFloat(formData.balance).toLocaleString('en-IN')}</strong>
                        {formData.nextPaymentDate && (
                          <span> | Due Date: <strong>{new Date(formData.nextPaymentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
                        )}
                      </p>
                      {!formData.nextPaymentDate && (
                        <p className="text-red-600 text-sm mt-1">Please set the next payment date above</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Joining From*</label>
                  <input
                    type="date"
                    name="memberJoiningFrom"
                    value={formData.memberJoiningFrom}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expire On</label>
                  <input
                    type="date"
                    name="expireOn"
                    value={formData.expireOn}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {formData.expireOn && selectedPackage && (
                    <small className="text-xs text-gray-600 mt-1 block">
                      Auto-calculated based on package duration (editable)
                    </small>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Counsellor</label>
                  <select
                    name="selectCounsellor"
                    value={formData.selectCounsellor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Select Counsellor">Select Counsellor</option>
                    {counselors.map(counselor => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Trainer</label>
                  <select
                    name="selectTrainer"
                    value={formData.selectTrainer}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Select Trainer">Select Trainer</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admission Fees (Optional)</label>
                  <input
                    type="number"
                    name="admissionFees"
                    value={formData.admissionFees}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount Received</label>
                  <input
                    type="number"
                    name="totalAmountReceived"
                    value={formData.totalAmountReceived}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Workout</label>
                  <select
                    name="selectWorkout"
                    value={formData.selectWorkout}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Select Workout">Select Workout</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Strength Training">Strength Training</option>
                    <option value="Yoga">Yoga</option>
                    <option value="CrossFit">CrossFit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Workout Level</label>
                  <select
                    name="selectWorkoutLevel"
                    value={formData.selectWorkoutLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Select Workout Level">Select Workout Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Remark"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="4"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-6 flex items-center justify-end gap-4">
            <button 
              type="button" 
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              onClick={cancelForm}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingMember ? 'Update Member' : 'Add Member')}
            </button>
          </div>
        </form>
          </div>
        </div>
      )}

      {/* Member History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History size={24} className="text-primary" />
                  Member History
                </h3>
                {historyMember && (
                  <p className="text-sm text-gray-600 mt-1">
                    {historyMember.name || `${historyMember.firstName} ${historyMember.lastName}`} - {historyMember.contact}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowHistoryModal(false); setHistoryMember(null); setMemberHistory(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto">
              {[
                { id: 'subscriptions', label: 'Subscriptions', icon: Package },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'pt', label: 'PT Sessions', icon: Dumbbell },
                { id: 'services', label: 'Services', icon: Package },
                { id: 'attendance', label: 'Attendance', icon: Clock }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    historyTab === tab.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-gray-500">Loading history...</p>
                </div>
              ) : memberHistory ? (
                <>
                  {/* Subscriptions Tab */}
                  {historyTab === 'subscriptions' && (
                    <div className="space-y-3">
                      {memberHistory.subscriptions && memberHistory.subscriptions.length > 0 ? (
                        memberHistory.subscriptions.map((sub, idx) => (
                          <div key={idx} className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{sub.packageName || 'Subscription'}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {sub.status || 'Active'}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                              <span className="font-medium">INR {sub.amount || 0}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No subscription history found</p>
                      )}
                    </div>
                  )}

                  {/* Payments Tab */}
                  {historyTab === 'payments' && (
                    <div className="space-y-3">
                      {memberHistory.payments && memberHistory.payments.length > 0 ? (
                        memberHistory.payments.map((payment, idx) => (
                          <div key={idx} className="p-4 bg-green-50 border border-green-100 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">INR {payment.amount || 0}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {payment.paymentMethod || 'Cash'}
                              </span>
                            </div>
                            {payment.description && (
                              <p className="mt-2 text-sm text-gray-600">{payment.description}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No payment history found</p>
                      )}
                    </div>
                  )}

                  {/* PT Sessions Tab */}
                  {historyTab === 'pt' && (
                    <div className="space-y-3">
                      {memberHistory.ptSessions && memberHistory.ptSessions.length > 0 ? (
                        memberHistory.ptSessions.map((session, idx) => (
                          <div key={idx} className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">PT Session with {session.trainerName || 'Trainer'}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(session.sessionDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                {session.duration || '60'} min
                              </span>
                            </div>
                            {session.notes && (
                              <p className="mt-2 text-sm text-gray-600">{session.notes}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No PT sessions found</p>
                      )}
                    </div>
                  )}

                  {/* Additional Services Tab */}
                  {historyTab === 'services' && (
                    <div className="space-y-3">
                      {memberHistory.additionalServices && memberHistory.additionalServices.length > 0 ? (
                        memberHistory.additionalServices.map((service, idx) => (
                          <div key={idx} className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{service.serviceName || 'Service'}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(service.purchaseDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="font-semibold text-gray-900">INR {service.amount || 0}</span>
                            </div>
                            {service.description && (
                              <p className="mt-2 text-sm text-gray-600">{service.description}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No additional services found</p>
                      )}
                    </div>
                  )}

                  {/* Attendance Tab */}
                  {historyTab === 'attendance' && (
                    <div className="space-y-2">
                      {memberHistory.attendance && memberHistory.attendance.length > 0 ? (
                        <div className="space-y-2">
                          {memberHistory.attendance.map((record, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-900">
                                  {new Date(record.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-600">
                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No attendance records found</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 py-12">No history data available</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => { setShowHistoryModal(false); setHistoryMember(null); setMemberHistory(null); }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Detection Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-yellow-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Copy size={24} className="text-orange-600" />
                  Duplicate Members Detection
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Found {duplicates.length} potential duplicate group(s)
                </p>
              </div>
              <button
                onClick={() => { setShowDuplicatesModal(false); setDuplicates([]); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDuplicates ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                  <p className="text-gray-500">Scanning for duplicates...</p>
                </div>
              ) : duplicates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <UserX size={48} className="text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Duplicates Found</h3>
                  <p className="text-gray-600">All member records appear to be unique.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {duplicates.map((duplicate, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                            {duplicate.count}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Duplicate {duplicate.type === 'contact' ? 'Phone Number' : 'Email'}
                            </h4>
                            <p className="text-sm text-gray-600">{duplicate.value}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          {duplicate.count} matches
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {duplicate.members.map((member, mIdx) => (
                          <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">
                                  {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                                </h5>
                                <p className="text-sm text-gray-600 mt-1">{member.contact}</p>
                                <p className="text-sm text-gray-600">{member.email}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.selectStatus === 'Active' || member.status === 'Active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {member.selectStatus || member.status || 'Unknown'}
                              </span>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600 mb-3">
                              <div>Joined: {member.memberJoiningFrom || member.joinDate || 'N/A'}</div>
                              <div>Package: {member.selectedPackage || 'N/A'}</div>
                              <div>Balance: INR {member.balance || 0}</div>
                            </div>

                            {mIdx === 0 && duplicate.members.length > 1 && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                {duplicate.members.slice(1).map((otherMember, oIdx) => (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleMergeMembers(member.id, otherMember.id)}
                                    disabled={mergingMembers}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium disabled:opacity-50"
                                  >
                                    <Merge size={14} />
                                    Merge with #{oIdx + 2}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {duplicates.length > 0 && (
                  <>
                    <AlertTriangle size={16} className="inline mr-1 text-orange-600" />
                    Merging will transfer all data to the primary account
                  </>
                )}
              </p>
              <button
                onClick={() => { setShowDuplicatesModal(false); setDuplicates([]); }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;


