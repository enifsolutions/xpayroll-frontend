import {
  Building2,
  Users,
  GitBranch,
  Clock,
  Calendar,
  FileText,
  Percent,
  BellRing,
  Cpu,
  Umbrella,
  CreditCard,
  Minus,
  Settings,
  LayoutDashboard,
  Shield,
  ClipboardList,
  UserCheck,
  Fingerprint,
  DollarSign,
  BarChart2,
  Receipt,
} from "lucide-react";


export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  permissionKey?: string;
  children?: NavItem[];
}

const navigationConfig: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    // No permission required — everyone sees the dashboard
  },
  {
    key: "master-data",
    label: "Master Data",
    path: "/master",
    icon: Settings,
    children: [
      {
        key: "branches",
        label: "Branches",
        path: "/master/branches",
        icon: Building2,
        permissionKey: "MasterData.Branches.View",
      },
      {
        key: "departments",
        label: "Departments",
        path: "/master/departments",
        icon: GitBranch,
        permissionKey: "MasterData.Departments.View",
      },
      {
        key: "designations",
        label: "Designations",
        path: "/master/designations",
        icon: Users,
        permissionKey: "MasterData.Designations.View",
      },
      {
        key: "shifts",
        label: "Shifts",
        path: "/master/shifts",
        icon: Clock,
        permissionKey: "MasterData.Shifts.View",
      },
      {
        key: "leave-types",
        label: "Leave Types",
        path: "/master/leave-types",
        icon: Clock,
        permissionKey: "MasterData.LeaveTypes.View",
      },
      {
        key: "statutory-rates",
        label: "Statutory Rates",
        path: "/master/statutory-rates",
        icon: Percent,
        permissionKey: "MasterData.StatutoryRates.View",
      },
      {
        key: "tax-config",
        label: "Tax Config",
        path: "/master/tax-config",
        icon: FileText,
        permissionKey: "MasterData.TaxConfig.View",
      },
      {
        key: "attendance-policies",
        label: "Attendance Policies",
        path: "/master/attendance-policies",
        icon: Calendar,
        permissionKey: "MasterData.AttendancePolicies.View",
      },
      {
        key: "devices",
        label: "Devices",
        path: "/master/devices",
        icon: Cpu,
        permissionKey: "MasterData.Devices.View",
      },
      {
        key: "biometric-bindings",
        label: "Biometric Bindings",
        path: "/master/biometric-bindings",
        icon: Fingerprint,
        permissionKey: "Biometric.Binding.View",
      },
      {
        key: "public-holidays",
        label: "Public Holidays",
        path: "/master/public-holidays",
        icon: Umbrella,
        permissionKey: "MasterData.PublicHolidays.View",
      },
      {
        key: "notification-templates",
        label: "Notification Templates",
        path: "/master/notification-templates",
        icon: BellRing,
        permissionKey: "MasterData.NotificationTemplates.View",
      },
    ],
  },
  {
    key: "hr",
    label: "HR",
    path: "/hr",
    icon: Users,
    children: [
      {
        key: "employees",
        label: "Employees",
        path: "/employees",
        icon: Users,
        permissionKey: "HR.Employee.View",
      },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    path: "/payroll",
    icon: CreditCard,
    children: [
      {
        key: "payroll-runs",
        label: "Payroll Runs",
        path: "/transactions/payroll-runs",
        icon: DollarSign,
        permissionKey: "Payroll.PayrollRun.View",
      },
      {
        key: "loans",
        label: "Loans",
        path: "/payroll/loans",
        icon: Minus,
        permissionKey: "Payroll.Loan.View",
      },
    ],
  },
  {
    key: "transactions",
    label: "Transactions",
    path: "/transactions",
    icon: ClipboardList,
    children: [
      {
        key: "leave-requests",
        label: "Leave Requests",
        path: "/transactions/leave-requests",
        icon: UserCheck,
        permissionKey: "Leave.Request.View",
      },
      {
        key: "my-leave",
        label: "Leave Applications",
        path: "/my-leave",
        icon: Calendar,
        permissionKey: "Leave.Request.Apply",
      },
      {
        key: "attendance-logs",
        label: "Attendance Logs",
        path: "/transactions/attendance-logs",
        icon: Clock,
        permissionKey: "Attendance.Log.View",
      },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    path: "/reports",
    icon: BarChart2,
    children: [
      {
        key: "payroll-reports",
        label: "Payroll",
        path: "/transactions/reports",
        icon: DollarSign,
        permissionKey: "Payroll.Reports.View",
      },
      {
        key: "tax-reports",
        label: "Tax (APIT)",
        path: "/reports/tax",
        icon: Receipt,
        permissionKey: "Tax.Reports.View",
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    children: [
      {
        key: "company",
        label: "Company Settings",
        path: "/settings/company",
        icon: Building2,
        permissionKey: "Settings.Company.View",
      },
      {
        key: "users",
        label: "User Accounts",
        path: "/settings/users",
        icon: Users,
        permissionKey: "Settings.Users.View",
      },
      {
        key: "roles",
        label: "Roles & Permissions",
        path: "/settings/roles",
        icon: Shield,
        permissionKey: "Settings.Roles.View",
      },
      {
        key: "crews",
        label: "Crews",
        path: "/settings/crews",
        icon: Users,
        permissionKey: "Settings.Crews.View",
      },
      {
        key: "groups",
        label: "Groups",
        path: "/settings/groups",
        icon: GitBranch,
        permissionKey: "Settings.Groups.View",
      },
      {
        key: "bank-branches",
        label: "Bank Branches",
        path: "/settings/bank-branches",
        icon: CreditCard,
        permissionKey: "Settings.BankBranches.View",
      },
    ],
  },
];

export default navigationConfig;
// ← This file needs manual edit — see instructions below
