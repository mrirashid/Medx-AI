// Full patient profile schema (frontend representation)
// Mirrors backend PATIENTS table fields shown in design reference.

export interface PatientProfile {
  id: string // uuid
  patient_code: string // human-readable unique code
  full_name: string
  dob: string // ISO date string
  gender: 'Male' | 'Female' | 'Other'
  phone_number: string
  email: string
  address: string
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_phone: string
  medical_history: string // free text or JSON
  allergies: string[]
  current_medications: string[]
  assigned_doctor_id?: string
  created_by?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  case_ids?: string[] // Cases ID list
}

export type NewPatientInput = Omit<PatientProfile, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>

export function buildPatientProfile(input: NewPatientInput): PatientProfile {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    patient_code: input.patient_code,
    full_name: input.full_name,
    dob: input.dob,
    gender: input.gender,
    phone_number: input.phone_number,
    email: input.email,
    address: input.address,
    emergency_contact_name: input.emergency_contact_name,
    emergency_contact_relation: input.emergency_contact_relation,
    emergency_contact_phone: input.emergency_contact_phone,
    medical_history: input.medical_history,
    allergies: input.allergies,
    current_medications: input.current_medications,
    assigned_doctor_id: input.assigned_doctor_id,
    created_by: input.created_by,
    is_deleted: false,
    created_at: now,
    updated_at: now,
    case_ids: input.case_ids ?? [],
  }
}
