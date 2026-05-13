/**
 * XpayRoll Permission Keys
 * Mirrors XpayRoll.Application.Common.Permissions.cs
 * Format: Module.Feature.Action
 */
export const Permissions = {
  MasterData: {
    Branches:             { View: 'MasterData.Branches.View',             Manage: 'MasterData.Branches.Manage' },
    Departments:          { View: 'MasterData.Departments.View',          Manage: 'MasterData.Departments.Manage' },
    Designations:         { View: 'MasterData.Designations.View',         Manage: 'MasterData.Designations.Manage' },
    Shifts:               { View: 'MasterData.Shifts.View',               Manage: 'MasterData.Shifts.Manage' },
    StatutoryRates:       { View: 'MasterData.StatutoryRates.View',       Manage: 'MasterData.StatutoryRates.Manage' },
    TaxConfig:            { View: 'MasterData.TaxConfig.View',            Manage: 'MasterData.TaxConfig.Manage' },
    AttendancePolicies:   { View: 'MasterData.AttendancePolicies.View',   Manage: 'MasterData.AttendancePolicies.Manage' },
    Devices:              { View: 'MasterData.Devices.View',              Manage: 'MasterData.Devices.Manage' },
    PublicHolidays:       { View: 'MasterData.PublicHolidays.View',       Manage: 'MasterData.PublicHolidays.Manage' },
    NotificationTemplates:{ View: 'MasterData.NotificationTemplates.View',Manage: 'MasterData.NotificationTemplates.Manage' },
    BenefitTypes:         { View: 'MasterData.BenefitTypes.View',         Manage: 'MasterData.BenefitTypes.Manage' },
    DeductionTypes:       { View: 'MasterData.DeductionTypes.View',       Manage: 'MasterData.DeductionTypes.Manage' },
  },
  HR: {
    Employee: {
      View:       'HR.Employee.View',
      Create:     'HR.Employee.Create',
      Update:     'HR.Employee.Update',
      Delete:     'HR.Employee.Delete',
      ViewSalary: 'HR.Employee.ViewSalary',
    },
    Contract:        { View: 'HR.Contract.View',        Manage: 'HR.Contract.Manage' },
    ShiftAssignment: { View: 'HR.ShiftAssignment.View', Manage: 'HR.ShiftAssignment.Manage' },
    Leave:           { View: 'HR.Leave.View',           Approve: 'HR.Leave.Approve', Manage: 'HR.Leave.Manage' },
  },
  Payroll: {
    PayrollRun: {
      View:    'Payroll.PayrollRun.View',
      Run:     'Payroll.PayrollRun.Run',
      Approve: 'Payroll.PayrollRun.Approve',
      Void:    'Payroll.PayrollRun.Void',
    },
    Loan: { View: 'Payroll.Loan.View', Manage: 'Payroll.Loan.Manage' },
  },
  Settings: {
    Roles:   { View: 'Settings.Roles.View',   Manage: 'Settings.Roles.Manage' },
    Users:   { View: 'Settings.Users.View',   Manage: 'Settings.Users.Manage' },
    Company: { View: 'Settings.Company.View', Manage: 'Settings.Company.Manage' },
  },
} as const;
