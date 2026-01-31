export interface VitalsEntry {
  id: string;
  patientId: string;
  patient: string;
  date: string;
  time: string;
  heartRate: number;
  pulse: number;
  bloodPressure: string;
  bp: string;
  temperature: number;
  temp: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  spo2: number;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  meta?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  type: string;
  ward?: string;
}

export interface ConversationItem {
  id: string;
  name: string;
  lastMessage: string;
  preview: string;
  time: string;
  unread: number;
  avatar: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  drug: string; // Alias for name
  dosage: string;
  dose: string; // Alias for dosage
  time: string;
  schedule: string; // Alias for time
  status: string;
  patientId: string;
}

export const getVitals = async (patientId?: string): Promise<VitalsEntry[]> => {
  return [
    {
      id: "1",
      patientId: patientId || "P001",
      patient: "John Doe",
      date: new Date().toISOString(),
      time: "10:00 AM",
      heartRate: 72,
      pulse: 72,
      bloodPressure: "120/80",
      bp: "120/80",
      temperature: 36.5,
      temp: 36.5,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      spo2: 98,
    },
  ];
};

export const getTasks = async (): Promise<TaskItem[]> => {
  return [
    { id: "1", title: "Check vitals", completed: false, meta: "Urgent" },
  ];
};

export const getSchedule = async (): Promise<ScheduleItem[]> => {
  return [
    { id: "1", title: "Morning Rounds", time: "08:00 AM", type: "Round", ward: "3A" },
  ];
};

export const getConversations = async (): Promise<ConversationItem[]> => {
  return [
    {
      id: "1",
      name: "Dr. Smith",
      lastMessage: "Please check patient X",
      preview: "Please check patient X",
      time: "10:00 AM",
      unread: 1,
      avatar: "https://ui-avatars.com/api/?name=Dr+Smith",
    },
  ];
};

export const getPatientDetail = async (id: string) => {
  return {
    id,
    name: "John Doe",
    vitals: [
      { label: "Blood Pressure", value: "120/80" },
      { label: "Heart Rate", value: "72 bpm" },
      { label: "Temperature", value: "36.5 °C" },
      { label: "SpO2", value: "98%" },
    ],
  };
};

export const getMedicationsToday = async (): Promise<MedicationItem[]> => {
  return [
    {
      id: "1",
      name: "Paracetamol",
      drug: "Paracetamol",
      dosage: "500mg",
      dose: "500mg",
      time: "08:00 AM",
      schedule: "08:00 AM",
      status: "Given",
      patientId: "P001",
    },
  ];
};
