// ── Dependents ──────────────────────────────────────────────────────────────
export interface EmployeeDependent {
  id: string;
  employeeId: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  gender?: string;
  nicNumber?: string;
  phoneNumber?: string;
  isEmergencyContact: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DependentForm {
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  gender: string;
  nicNumber: string;
  phoneNumber: string;
  isEmergencyContact: boolean;
  notes: string;
}

export const EMPTY_DEPENDENT: DependentForm = {
  fullName: '', relationship: '', dateOfBirth: '', gender: '',
  nicNumber: '', phoneNumber: '', isEmergencyContact: false, notes: '',
};

export const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
export const DEP_GENDERS   = ['Male', 'Female', 'Other'];

// ── Transport ───────────────────────────────────────────────────────────────
export interface EmployeeTransport {
  id: string;
  employeeId: string;
  residentialAddress?: string;
  city?: string;
  distanceKm?: number;
  travelType?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  fuelAllowanceEligible: boolean;
  transportAllowance?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TransportForm {
  residentialAddress: string;
  city: string;
  distanceKm: string;
  travelType: string;
  vehicleType: string;
  vehicleNumber: string;
  fuelAllowanceEligible: boolean;
  transportAllowance: string;
  notes: string;
}

export const EMPTY_TRANSPORT: TransportForm = {
  residentialAddress: '', city: '', distanceKm: '', travelType: '',
  vehicleType: '', vehicleNumber: '', fuelAllowanceEligible: false,
  transportAllowance: '', notes: '',
};

export const TRAVEL_TYPES  = ['Own', 'Public', 'Company', 'Carpool'];
export const VEHICLE_TYPES = ['Car', 'Motorbike', 'Bus', 'Train', 'Bicycle', 'Walk', 'Other'];

// ── Qualifications ──────────────────────────────────────────────────────────
export interface EmployeeQualification {
  id: string;
  employeeId: string;
  category: string;
  title: string;
  institution?: string;
  fromDate?: string;
  toDate?: string;
  isCurrent: boolean;
  grade?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QualificationForm {
  category: string;
  title: string;
  institution: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  grade: string;
  description: string;
}

export const EMPTY_QUALIFICATION: QualificationForm = {
  category: 'Education', title: '', institution: '', fromDate: '',
  toDate: '', isCurrent: false, grade: '', description: '',
};

export const QUALIFICATION_CATEGORIES = [
  'Education', 'Experience', 'Expertise', 'Certification', 'Language',
];

// ── Documents ───────────────────────────────────────────────────────────────
export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentName: string;
  fileUrl: string;
  fileName?: string;
  fileSizeKb?: number;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentForm {
  documentName: string;
  expiryDate: string;
  notes: string;
}

export const EMPTY_DOCUMENT: DocumentForm = {
  documentName: '', expiryDate: '', notes: '',
};

// ── Master lookup types ──────────────────────────────────────────────────────
export interface CrewOption {
  id: string;
  name: string;
  code: string;
  departmentName?: string | null;
  leadName?: string | null;
  isActive: boolean;
}

export interface GroupOption {
  id: string;
  name: string;
  code: string;
  departmentName?: string | null;
  leadName?: string | null;
  isActive: boolean;
}

export interface BankBranchOption {
  id: string;
  bankName: string;
  branchName: string;
  branchCode?: string | null;
  city?: string | null;
  swiftCode?: string | null;
  isActive: boolean;
}
