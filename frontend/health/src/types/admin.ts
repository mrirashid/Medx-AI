export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "nurse" | "admin";
  status: "active" | "inactive";
  dateAdded: string;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}
