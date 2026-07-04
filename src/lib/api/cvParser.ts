import api from "@/lib/axios";

export interface CvParseResult {
  personalInfo: {
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    address: string;
    nationalIdNumber: string;
  };
  qualifications: Array<{
    category:
      | "Education"
      | "Experience"
      | "Expertise"
      | "Certification"
      | "Language";
    title: string;
    institution: string;
    fromDate: string;
    toDate: string;
    isCurrent: boolean;
    grade: string;
    description: string;
  }>;
  summary: string;
  parseLogId?: number | null;
}

export async function parseCv(file: File): Promise<CvParseResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<CvParseResult>(
    "/employees/cv-parser/parse",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data;
}

export interface RecentCvParse {
  id: number;
  fileName: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export async function getRecentCvParses(
  userId: number,
): Promise<RecentCvParse[]> {
  const res = await api.get<RecentCvParse[]>(
    `/employees/cv-parser/recent?userId=${userId}`,
  );
  return res.data;
}

export async function getCvParseById(id: number): Promise<CvParseResult> {
  const res = await api.get<CvParseResult>(`/employees/cv-parser/${id}`);
  return res.data;
}

export async function consumeCvParse(
  id: number,
  employeeId: string | number,
): Promise<void> {
  await api.post(`/employees/cv-parser/${id}/consume`, { employeeId });
}
