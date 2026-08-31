/**
 * XpayRoll Permission Keys
 * Mirrors XpayRoll.Application.Common.Permissions.cs
 * Format: Module.Feature.Action
 *
 * NOTE: Portal.* permissions intentionally excluded - they gate the ESS
 * portal backend, not the admin app, even though both share the same
 * API and permissions table. Do not add them here.
 *
 * NOTE: HR.Employee.UnmaskSalary exists on the backend but is
 * intentionally left unused on the frontend - the salary reveal control
 * in employees/page.tsx is gated by ViewSalary alone (single-tier).
 * Reserved key, not a bug.
 */
export const Permissions = {
  MasterData: {
    Branches: {
      View: "MasterData.Branches.View",
      Manage: "MasterData.Branches.Manage",
    },
    Departments: {
      View: "MasterData.Departments.View",
      Manage: "MasterData.Departments.Manage",
    },
    Designations: {
      View: "MasterData.Designations.View",
      Manage: "MasterData.Designations.Manage",
    },
    Shifts: {
      View: "MasterData.Shifts.View",
      Manage: "MasterData.Shifts.Manage",
    },
    StatutoryRates: {
      View: "MasterData.StatutoryRates.View",
      Manage: "MasterData.StatutoryRates.Manage",
    },
    TaxConfig: {
      View: "MasterData.TaxConfig.View",
      Manage: "MasterData.TaxConfig.Manage",
    },
    AttendancePolicies: {
      View: "MasterData.AttendancePolicies.View",
      Manage: "MasterData.AttendancePolicies.Manage",
    },
    Devices: {
      View: "MasterData.Devices.View",
      Manage: "MasterData.Devices.Manage",
    },
    PublicHolidays: {
      View: "MasterData.PublicHolidays.View",
      Manage: "MasterData.PublicHolidays.Manage",
    },
    NotificationTemplates: {
      View: "MasterData.NotificationTemplates.View",
      Manage: "MasterData.NotificationTemplates.Manage",
    },
    BenefitTypes: {
      View: "MasterData.BenefitTypes.View",
      Manage: "MasterData.BenefitTypes.Manage",
    },
    DeductionTypes: {
      View: "MasterData.DeductionTypes.View",
      Manage: "MasterData.DeductionTypes.Manage",
    },
    LeaveTypes: {
      View: "MasterData.LeaveTypes.View",
      Manage: "MasterData.LeaveTypes.Manage",
    },
    LeaveTemplate: {
      View: "MasterData.LeaveTemplate.View",
      Create: "MasterData.LeaveTemplate.Create",
      Edit: "MasterData.LeaveTemplate.Edit",
      Delete: "MasterData.LeaveTemplate.Delete",
    },
    Crews: {
      View: "MasterData.Crews.View",
      Manage: "MasterData.Crews.Manage",
    },
    Groups: {
      View: "MasterData.Groups.View",
      Manage: "MasterData.Groups.Manage",
    },
    BankBranches: {
      View: "MasterData.BankBranches.View",
      Manage: "MasterData.BankBranches.Manage",
    },
  },
  HR: {
    Employee: {
      View: "HR.Employee.View",
      Create: "HR.Employee.Create",
      Update: "HR.Employee.Update",
      Delete: "HR.Employee.Delete",
      ViewSalary: "HR.Employee.ViewSalary",
      UnmaskSalary: "HR.Employee.UnmaskSalary", // reserved - see file header note
      ParseCv: "HR.Employee.ParseCv",
    },
    Contract: { View: "HR.Contract.View", Manage: "HR.Contract.Manage" },
    ShiftAssignment: {
      View: "HR.ShiftAssignment.View",
      Manage: "HR.ShiftAssignment.Manage",
    },
    Leave: {
      View: "HR.Leave.View",
      Approve: "HR.Leave.Approve",
      Manage: "HR.Leave.Manage",
    },
    Notifications: {
      ViewAll: "HR.Notifications.ViewAll",
    },
    Dependents: {
      View: "HR.Dependents.View",
      Manage: "HR.Dependents.Manage",
    },
    Transport: {
      View: "HR.Transport.View",
      Manage: "HR.Transport.Manage",
    },
    Documents: {
      View: "HR.Documents.View",
      Manage: "HR.Documents.Manage",
    },
    Qualifications: {
      View: "HR.Qualifications.View",
      Manage: "HR.Qualifications.Manage",
    },
    EmployeeContract: {
      Request: "HR.EmployeeContract.Request",
      Approve: "HR.EmployeeContract.Approve",
    },
  },
  Payroll: {
    PayrollRun: {
      View: "Payroll.PayrollRun.View",
      Create: "Payroll.PayrollRun.Create",
      Process: "Payroll.PayrollRun.Process",
      Approve: "Payroll.PayrollRun.Approve",
      Void: "Payroll.PayrollRun.Void",
      // Run: removed - phantom key, no backend counterpart, zero usages found
    },
    Loan: {
      View: "Payroll.Loan.View",
      Manage: "Payroll.Loan.Manage",
      Create: "Payroll.Loan.Create",
      Approve: "Payroll.Loan.Approve",
      Reject: "Payroll.Loan.Reject",
      Disburse: "Payroll.Loan.Disburse",
      Skip: "Payroll.Loan.Skip",
      Hold: "Payroll.Loan.Hold",
      Resume: "Payroll.Loan.Resume",
      Settle: "Payroll.Loan.Settle",
      Restructure: "Payroll.Loan.Restructure",
      Delete: "Payroll.Loan.Delete",
    },
    LoanType: {
      View: "Payroll.LoanType.View",
      Manage: "Payroll.LoanType.Manage",
    },
    Payslip: {
      View: "Payroll.Payslip.View",
      ViewAll: "Payroll.Payslip.ViewAll",
    },
    Reports: {
      View: "Payroll.Reports.View",
      PrintLog: "Payroll.Reports.PrintLog",
      EpfCForm: "Payroll.Reports.EpfCForm",
      EtfReturn: "Payroll.Reports.EtfReturn",
    },
  },
  Leave: {
    Request: {
      View: "Leave.Request.View",
      Apply: "Leave.Request.Apply",
      Approve: "Leave.Request.Approve",
      Cancel: "Leave.Request.Cancel",
      Revoke: "Leave.Request.Revoke",
    },
  },
  SystemAdmin: {
    Alerts: {
      View: "System.Alerts.View",
      Acknowledge: "System.Alerts.Acknowledge",
    },
  },
  Settings: {
    Roles: { View: "Settings.Roles.View", Manage: "Settings.Roles.Manage" },
    Users: {
      View: "Settings.Users.View",
      Create: "Settings.Users.Create",
      Edit: "Settings.Users.Edit",
      Delete: "Settings.Users.Delete",
      ResetPassword: "Settings.Users.ResetPassword",
      // Manage: removed - phantom key, no backend counterpart, zero usages found
    },
    Company: {
      View: "Settings.Company.View",
      Manage: "Settings.Company.Manage",
      Create: "Settings.Company.Create",
    },
  },
  Attendance: {
    Log: {
      View: "Attendance.Log.View",
      Add: "Attendance.Log.Add",
      Edit: "Attendance.Log.Edit",
      Delete: "Attendance.Log.Delete",
    },
    Generation: {
      View: "Attendance.Generation.View",
      Run: "Attendance.Generation.Run",
    },
    Sync: {
      View: "Attendance.Sync.View",
      Run: "Attendance.Sync.Run",
    },
    Adjustment: {
      View: "Attendance.Adjustment.View",
      Request: "Attendance.Adjustment.Request",
      Approve: "Attendance.Adjustment.Approve",
    },
    Ot: {
      View: "Attendance.Ot.View",
      Request: "Attendance.Ot.Request",
      Approve: "Attendance.Ot.Approve",
    },
  },
  Biometric: {
    Binding: {
      View: "Biometric.Binding.View",
      Manage: "Biometric.Binding.Manage",
    },
    Device: {
      View: "Biometric.Device.View",
      Manage: "Biometric.Device.Manage",
    },
    Sync: {
      View: "Biometric.Sync.View",
    },
  },
  Tax: {
    Reports: {
      View: "Tax.Reports.View",
      Generate: "Tax.Reports.Generate",
      DownloadSchedule: "Tax.Reports.DownloadSchedule",
      DownloadT10: "Tax.Reports.DownloadT10",
    },
  },
  Reports: {
    BankTransfer: {
      View: "Reports.BankTransfer.View",
      Export: "Reports.BankTransfer.Export",
    },
    CostCentre: {
      View: "Reports.CostCentre.View",
      Export: "Reports.CostCentre.Export",
    },
    Comparison: {
      View: "Reports.Comparison.View",
      Export: "Reports.Comparison.Export",
    },
    LoanDeduction: {
      View: "Reports.LoanDeduction.View",
      Export: "Reports.LoanDeduction.Export",
    },
    Attendance: {
      View: "Reports.Attendance.View",
      Export: "Reports.Attendance.Export",
    },
    LeaveBalance: {
      View: "Reports.LeaveBalance.View",
      Export: "Reports.LeaveBalance.Export",
    },
    Headcount: {
      View: "Reports.Headcount.View",
      Export: "Reports.Headcount.Export",
    },
    LateArrivals: {
      View: "Reports.LateArrivals.View",
      Export: "Reports.LateArrivals.Export",
    },
    Overtime: {
      View: "Reports.Overtime.View",
      Export: "Reports.Overtime.Export",
    },
    NoPay: { View: "Reports.NoPay.View", Export: "Reports.NoPay.Export" },
    LeaveUtil: {
      View: "Reports.LeaveUtil.View",
      Export: "Reports.LeaveUtil.Export",
    },
    ContractExpiry: {
      View: "Reports.ContractExpiry.View",
      Export: "Reports.ContractExpiry.Export",
    },
  },
  PayslipExport: {
    ExportPdf: "Payroll.PayslipExport.ExportPdf",
    ExportBulkPdf: "Payroll.PayslipExport.ExportBulkPdf",
    ExportExcel: "Payroll.PayslipExport.ExportExcel",
    ExportCsv: "Payroll.PayslipExport.ExportCsv",
    ExportBankLetter: "Payroll.PayslipExport.ExportBankLetter",
    EmailPayslip: "Payroll.PayslipExport.EmailPayslip",
    BulkEmail: "Payroll.PayslipExport.BulkEmail",
    Reprint: "Payroll.PayslipExport.Reprint",
  },
  Recruitment: {
    Requisition: {
      View: "Recruitment.Requisition.View",
      Create: "Recruitment.Requisition.Create",
      Edit: "Recruitment.Requisition.Edit",
      Delete: "Recruitment.Requisition.Delete",
      ApproveL1: "Recruitment.Requisition.ApproveL1",
      ApproveL2: "Recruitment.Requisition.ApproveL2",
    },
    Posting: {
      View: "Recruitment.Posting.View",
      Create: "Recruitment.Posting.Create",
      Edit: "Recruitment.Posting.Edit",
      Delete: "Recruitment.Posting.Delete",
      Publish: "Recruitment.Posting.Publish",
      Unpublish: "Recruitment.Posting.Unpublish",
    },
    Candidate: {
      View: "Recruitment.Candidate.View",
      Create: "Recruitment.Candidate.Create",
      Edit: "Recruitment.Candidate.Edit",
      Delete: "Recruitment.Candidate.Delete",
      ViewCv: "Recruitment.Candidate.ViewCv",
      Blacklist: "Recruitment.Candidate.Blacklist",
      Export: "Recruitment.Candidate.Export",
    },
    Application: {
      View: "Recruitment.Application.View",
      Create: "Recruitment.Application.Create",
      ChangeStage: "Recruitment.Application.ChangeStage",
      Reject: "Recruitment.Application.Reject",
      ViewAll: "Recruitment.Application.ViewAll",
    },
    ScorecardTemplate: {
      View: "Recruitment.ScorecardTemplate.View",
      Create: "Recruitment.ScorecardTemplate.Create",
      Update: "Recruitment.ScorecardTemplate.Update",
      Delete: "Recruitment.ScorecardTemplate.Delete",
    },
    SalaryBand: {
      View: "Recruitment.SalaryBand.View",
      Create: "Recruitment.SalaryBand.Create",
      Edit: "Recruitment.SalaryBand.Edit",
      Delete: "Recruitment.SalaryBand.Delete",
    },
    Skill: { Manage: "Recruitment.Skill.Manage" },
    Certification: { Manage: "Recruitment.Certification.Manage" },
    Competency: { Manage: "Recruitment.Competency.Manage" },
    Ai: {
      ParseCv: "Recruitment.Ai.ParseCv",
      MatchScore: "Recruitment.Ai.MatchScore",
      OverrideScoreLimit: "Recruitment.Ai.OverrideScoreLimit",
      TalentRediscovery: "Recruitment.Ai.TalentRediscovery",
      SalaryIntelligence: "Recruitment.Ai.SalaryIntelligence",
      InterviewSummary: "Recruitment.Ai.InterviewSummary",
      OverrideInterviewSummary: "Recruitment.Ai.OverrideInterviewSummary",
      OverrideTalentRediscovery: "Recruitment.Ai.OverrideTalentRediscovery",
      OverrideSalaryNarrative: "Recruitment.Ai.OverrideSalaryNarrative",
    },
    Onboarding: {
      ConvertToEmployee: "Recruitment.Onboarding.ConvertToEmployee",
    },
    Reports: {
      View: "Recruitment.Reports.View",
      Export: "Recruitment.Reports.Export",
      Funnel: { View: "Recruitment.Reports.Funnel.View" },
      TimeToHire: { View: "Recruitment.Reports.TimeToHire.View" },
      SourceEffectiveness: {
        View: "Recruitment.Reports.SourceEffectiveness.View",
      },
      RequisitionAging: { View: "Recruitment.Reports.RequisitionAging.View" },
      DiversitySnapshot: { View: "Recruitment.Reports.DiversitySnapshot.View" },
    },
    Interview: {
      View: "Recruitment.Interview.View",
      Create: "Recruitment.Interview.Create",
      Edit: "Recruitment.Interview.Edit",
      Delete: "Recruitment.Interview.Delete",
      ManagePanel: "Recruitment.Interview.ManagePanel",
      SubmitScorecard: "Recruitment.Interview.SubmitScorecard",
      ViewAllScorecards: "Recruitment.Interview.ViewAllScorecards",
    },
    Offer: {
      View: "Recruitment.Offer.View",
      Create: "Recruitment.Offer.Create",
      Edit: "Recruitment.Offer.Edit",
      Delete: "Recruitment.Offer.Delete",
      Submit: "Recruitment.Offer.Submit",
      Approve: "Recruitment.Offer.Approve",
      Send: "Recruitment.Offer.Send",
      RecordResponse: "Recruitment.Offer.RecordResponse",
      Withdraw: "Recruitment.Offer.Withdraw",
    },
  },
  Ai: {
    Chat: {
      Use: "Ai.Chat.Use",
      ViewHistory: "Ai.Chat.ViewHistory",
      DeleteHistory: "Ai.Chat.DeleteHistory",
      ViewUsage: "Ai.Chat.ViewUsage",
    },
  },
} as const;