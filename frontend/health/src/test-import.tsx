// Test file to verify AdminUser export
import type { AdminUser } from "./contexts/AdminDataContext";

const testUser: AdminUser = {
  id: "test",
  name: "Test",
  email: "test@test.com",
  role: "doctor",
  status: "active",
  dateAdded: "2024-01-01",
};

console.log("Test import successful:", testUser);
