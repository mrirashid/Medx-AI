import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Gender = "Male" | "Female" | "Other";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type CaseStatus = "Active" | "Complete";

export interface Patient {
  id: string; // e.g., BR-2025-0157
  name: string;
  gender: Gender;
  dob: string; // ISO date
  contactNumber: string;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null; // "Name - Relation - Phone"
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: string | null;
  knownAllergies?: string[];
  currentMedications?: string[];
  doctorId: string; // assigned primary doctor
  totalCases: number;
  lastCaseDate: string | null; // ISO date
  status: "Active" | "Inactive"; // activation state
  createdAt: string; // creation timestamp
  lastUpdated: string; // ISO date
}

export interface ClinicalCase {
  id: string; // e.g., BR-2025-0157-001
  patientId: string;
  doctorId: string;
  createdAt: string; // ISO datetime
  riskLevel: RiskLevel;
  hasPrediction: boolean;
  hasRecommendation: boolean;
  status: CaseStatus;
}

interface ClinicalDataContextType {
  patients: Patient[];
  cases: ClinicalCase[];
  // CRUD
  createPatient: (
    data: Omit<
      Patient,
      | "id"
      | "totalCases"
      | "lastCaseDate"
      | "lastUpdated"
      | "status"
      | "createdAt"
    > & {
      id?: string; // optional custom ID override
    }
  ) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  createCase: (data: Omit<ClinicalCase, "id" | "createdAt">) => ClinicalCase;
  updateCase: (id: string, updates: Partial<ClinicalCase>) => void;
  deleteCase: (id: string) => void;
  // Queries
  getPatientsForDoctor: (doctorId: string) => Patient[];
  getCasesForDoctor: (doctorId: string) => ClinicalCase[];
  getCasesForPatientDoctor: (
    patientId: string,
    doctorId: string
  ) => ClinicalCase[];
}

const ClinicalDataContext = createContext<ClinicalDataContextType | undefined>(
  undefined
);

const PKEY = "clinicalPatients";
const CKEY = "clinicalCases";

function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      return parsed.map((p) => ({
        status: p.status || "Active",
        createdAt: p.createdAt || p.lastUpdated || new Date().toISOString(),
        ...p,
      }));
    }
  } catch {}
  const now = new Date().toISOString();
  return [
    {
      id: "BR-2025-0157",
      name: "Maria Rodriguez",
      gender: "Female",
      dob: "1978-01-15",
      contactNumber: "+1-555-9999",
      email: "maria.r@email.com",
      address: "456 Oak Avenue, Boston, MA 02102",
      emergencyContact: "Carlos Rodriguez - Husband - +1-555-0124",
      medicalHistory: "",
      knownAllergies: ["Penicillin"],
      currentMedications: [],
      doctorId: "1",
      totalCases: 2,
      lastCaseDate: "2025-01-20T18:30:00.000Z",
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0142",
      name: "John Smith",
      gender: "Male",
      dob: "1972-04-10",
      contactNumber: "+1-555-1234",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "",
      knownAllergies: [],
      currentMedications: [],
      doctorId: "1",
      totalCases: 0,
      lastCaseDate: null,
      status: "Inactive",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0128",
      name: "Lisa Chen",
      gender: "Female",
      dob: "1987-08-22", // Age ~38
      contactNumber: "+1-555-5678",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "",
      knownAllergies: [],
      currentMedications: [],
      doctorId: "1",
      totalCases: 0,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0135",
      name: "Ahmed Hassan",
      gender: "Male",
      dob: "1995-03-12", // Age ~30
      contactNumber: "+1-555-7890",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "",
      knownAllergies: [],
      currentMedications: [],
      doctorId: "1",
      totalCases: 1,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0149",
      name: "Emily Johnson",
      gender: "Female",
      dob: "1960-09-15", // Age ~65
      contactNumber: "+1-555-3456",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "Hypertension, Diabetes",
      knownAllergies: ["Sulfa"],
      currentMedications: ["Metformin", "Lisinopril"],
      doctorId: "1",
      totalCases: 3,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0163",
      name: "David Kim",
      gender: "Male",
      dob: "1982-07-20", // Age ~43
      contactNumber: "+1-555-2468",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "",
      knownAllergies: [],
      currentMedications: [],
      doctorId: "1",
      totalCases: 2,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
    {
      id: "BR-2025-0178",
      name: "Sarah Williams",
      gender: "Female",
      dob: "2000-12-05", // Age ~25
      contactNumber: "+1-555-8901",
      email: null,
      address: null,
      emergencyContact: null,
      medicalHistory: "",
      knownAllergies: [],
      currentMedications: [],
      doctorId: "1",
      totalCases: 1,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    },
  ];
}

function loadCases(): ClinicalCase[] {
  try {
    const raw = localStorage.getItem(CKEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Generate dynamic sample data for the last 7 days
  const now = new Date();
  const cases: ClinicalCase[] = [];

  // Add cases from different days in the past week
  const daysAgo = [
    { days: 1, count: 2, risk: ["Medium", "Low"] as RiskLevel[] },
    { days: 2, count: 1, risk: ["High"] as RiskLevel[] },
    { days: 3, count: 3, risk: ["Low", "Medium", "Critical"] as RiskLevel[] },
    { days: 5, count: 1, risk: ["Medium"] as RiskLevel[] },
    { days: 6, count: 2, risk: ["Low", "High"] as RiskLevel[] },
  ];

  let caseCounter = 1;

  daysAgo.forEach(({ days, count, risk }) => {
    for (let i = 0; i < count; i++) {
      const caseDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      // Add some random hours/minutes for realistic timing
      caseDate.setHours(Math.floor(Math.random() * 16) + 8); // 8 AM to 11 PM
      caseDate.setMinutes(Math.floor(Math.random() * 60));

      cases.push({
        id: `BR-2025-0157-${String(caseCounter).padStart(3, "0")}`,
        patientId: "BR-2025-0157",
        doctorId: "1",
        createdAt: caseDate.toISOString(),
        riskLevel: risk[i % risk.length],
        hasPrediction: true,
        hasRecommendation: Math.random() > 0.3, // 70% have recommendations
        status: Math.random() > 0.2 ? "Complete" : "Active", // 80% complete
      });
      caseCounter++;
    }
  });

  // Add some older cases for historical context
  cases.push(
    {
      id: "BR-2025-0157-101",
      patientId: "BR-2025-0157",
      doctorId: "1",
      createdAt: "2025-01-10T22:15:00.000Z",
      riskLevel: "Medium",
      hasPrediction: true,
      hasRecommendation: true,
      status: "Complete",
    },
    {
      id: "BR-2025-0157-102",
      patientId: "BR-2025-0157",
      doctorId: "1",
      createdAt: "2025-01-20T18:30:00.000Z",
      riskLevel: "High",
      hasPrediction: true,
      hasRecommendation: true,
      status: "Complete",
    }
  );

  return cases;
}

export function ClinicalDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [patients, setPatients] = useState<Patient[]>(loadPatients());
  const [cases, setCases] = useState<ClinicalCase[]>(loadCases());

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(PKEY, JSON.stringify(patients));
    } catch {}
  }, [patients]);
  useEffect(() => {
    try {
      localStorage.setItem(CKEY, JSON.stringify(cases));
    } catch {}
  }, [cases]);

  // Helpers
  const getPatientsForDoctor = (doctorId: string) => patients;
  const getCasesForDoctor = (doctorId: string) =>
    cases.filter((c) => c.doctorId === doctorId);
  const getCasesForPatientDoctor = (patientId: string, doctorId: string) =>
    cases.filter((c) => c.patientId === patientId && c.doctorId === doctorId);

  const createPatient: ClinicalDataContextType["createPatient"] = (data) => {
    const now = new Date().toISOString();
    const generatedId = `BR-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const patient: Patient = {
      ...data,
      id: data.id && data.id.trim().length ? data.id.trim() : generatedId,
      totalCases: 0,
      lastCaseDate: null,
      status: "Active",
      createdAt: now,
      lastUpdated: now,
    };
    setPatients((prev) => [...prev, patient]);
    return patient;
  };

  const updatePatient: ClinicalDataContextType["updatePatient"] = (
    id,
    updates
  ) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...updates, lastUpdated: new Date().toISOString() }
          : p
      )
    );
  };

  const deletePatient: ClinicalDataContextType["deletePatient"] = (id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setCases((prev) => prev.filter((c) => c.patientId !== id));
  };

  const createCase: ClinicalDataContextType["createCase"] = (data) => {
    const now = new Date().toISOString();
    const sequence = (
      cases.filter((c) => c.patientId === data.patientId).length + 1
    )
      .toString()
      .padStart(3, "0");
    const id = `${data.patientId}-${sequence}`;
    const newCase: ClinicalCase = { ...data, id, createdAt: now };
    setCases((prev) => [newCase, ...prev]);
    // update patient totals
    setPatients((prev) =>
      prev.map((p) =>
        p.id === data.patientId
          ? {
              ...p,
              totalCases: (p.totalCases || 0) + 1,
              lastCaseDate: now,
              lastUpdated: now,
            }
          : p
      )
    );
    return newCase;
  };

  const updateCase: ClinicalDataContextType["updateCase"] = (id, updates) => {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCase: ClinicalDataContextType["deleteCase"] = (id) => {
    const target = cases.find((c) => c.id === id);
    setCases((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      // Recompute patient totals
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== target.patientId) return p;
          const remaining = cases.filter(
            (c) => c.id !== id && c.patientId === p.id
          );
          const last = remaining.sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )[0];
          return {
            ...p,
            totalCases: remaining.length,
            lastCaseDate: last ? last.createdAt : null,
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }
  };

  const value: ClinicalDataContextType = useMemo(
    () => ({
      patients,
      cases,
      createPatient,
      updatePatient,
      deletePatient,
      createCase,
      updateCase,
      deleteCase,
      getPatientsForDoctor,
      getCasesForDoctor,
      getCasesForPatientDoctor,
    }),
    [patients, cases]
  );

  return (
    <ClinicalDataContext.Provider value={value}>
      {children}
    </ClinicalDataContext.Provider>
  );
}

export function useClinicalData() {
  const ctx = useContext(ClinicalDataContext);
  if (!ctx)
    throw new Error("useClinicalData must be used within ClinicalDataProvider");
  return ctx;
}
