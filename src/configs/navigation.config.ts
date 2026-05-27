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
        key: "loans",
        label: "Loans",
        path: "/payroll/loans",
        icon: Minus,
        permissionKey: "Payroll.Loan.View",
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
    ],
  },
];

export default navigationConfig;
