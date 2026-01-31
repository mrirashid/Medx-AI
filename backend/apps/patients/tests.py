from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.patients.models import Patient

User = get_user_model()


class PatientAPITest(APITestCase):
    
    def setUp(self):
        # Create roles
        self.nurse = User.objects.create_user(
            email="nurse@example.com",
            full_name="Nurse One",
            password="Pass1234",
            role="nurse"
        )

        self.doctor = User.objects.create_user(
            email="doctor@example.com",
            full_name="Doctor One",
            password="Pass1234",
            role="doctor"
        )

        self.superadmin = User.objects.create_superuser(
            email="admin@example.com",
            full_name="Super Admin",
            password="Pass1234"
        )

        # Endpoint base
        self.list_url = reverse("patient-list")  # /patients/

        # Authenticate as nurse by default
        self.client.force_authenticate(user=self.nurse)


    # ---------------------------------------------
    # Nurse Tests
    # ---------------------------------------------
    def test_nurse_can_create_patient(self):
        data = {
            "full_name": "Test Patient",
            "dob": "1999-01-01",
            "gender": "female",
            "phone_number": "0123456789",
            "email": "patient@example.com",
            "assigned_doctor": self.doctor.id,
        }

        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Patient.objects.filter(full_name="Test Patient").exists())


    def test_nurse_can_list_all_patients(self):
        # Create multiple patients
        Patient.objects.create(
            full_name="Patient A",
            phone_number="123",
            gender="male",
            created_by=self.nurse
        )
        Patient.objects.create(
            full_name="Patient B",
            phone_number="456",
            gender="female",
            created_by=self.nurse
        )

        self.client.force_authenticate(user=self.nurse)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        # Handle pagination
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)


    def test_nurse_can_update_any_patient(self):
        patient = Patient.objects.create(
            full_name="Old Name",
            gender="female",
            phone_number="000",
            created_by=self.nurse,
            assigned_doctor=self.doctor,
        )

        url = reverse("patient-detail", kwargs={"pk": patient.id})
        data = {"full_name": "Updated"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(200, response.status_code)

        patient.refresh_from_db()
        self.assertEqual(patient.full_name, "Updated")


    def test_nurse_can_delete_patient(self):
        patient = Patient.objects.create(
            full_name="To Delete",
            gender="female",
            phone_number="001",
            created_by=self.nurse
        )

        url = reverse("patient-detail", kwargs={"pk": patient.id})
        response = self.client.delete(url)

        self.assertEqual(200, response.status_code)

        patient.refresh_from_db()
        self.assertTrue(patient.is_deleted)


    # ---------------------------------------------
    # Doctor Tests
    # ---------------------------------------------
    def test_doctor_can_list_only_assigned_patients(self):
        p1 = Patient.objects.create(
            full_name="Assigned Patient",
            phone_number="111",
            gender="female",
            assigned_doctor=self.doctor,
            created_by=self.nurse
        )

        p2 = Patient.objects.create(
            full_name="Not Assigned",
            phone_number="222",
            gender="female",
            created_by=self.nurse
        )

        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(self.list_url)

        self.assertEqual(200, response.status_code)
        # Handle pagination
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["full_name"], "Assigned Patient")


    def test_doctor_cannot_create_patient(self):
        self.client.force_authenticate(user=self.doctor)
        data = {
            "full_name": "New Patient",
            "gender": "female",
            "phone_number": "000",
            "assigned_doctor": self.doctor.id
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(403, response.status_code)


    def test_doctor_cannot_update_patient(self):
        patient = Patient.objects.create(
            full_name="X",
            phone_number="1",
            gender="female",
            created_by=self.nurse,
            assigned_doctor=self.doctor
        )

        self.client.force_authenticate(user=self.doctor)
        url = reverse("patient-detail", kwargs={"pk": patient.id})
        response = self.client.patch(url, {"full_name": "Hack"}, format="json")
        self.assertEqual(status.HTTP_403_FORBIDDEN, response.status_code)


    def test_doctor_can_retrieve_assigned(self):
        patient = Patient.objects.create(
            full_name="Assigned",
            phone_number="1",
            gender="female",
            created_by=self.nurse,
            assigned_doctor=self.doctor,
        )

        self.client.force_authenticate(user=self.doctor)

        url = reverse("patient-detail", kwargs={"pk": patient.id})
        response = self.client.get(url)

        self.assertEqual(200, response.status_code)
        self.assertEqual("Assigned", response.data["full_name"])


    def test_doctor_cannot_retrieve_unassigned(self):
        patient = Patient.objects.create(
            full_name="Not Allowed",
            phone_number="1",
            gender="female",
            created_by=self.nurse
        )

        self.client.force_authenticate(user=self.doctor)

        url = reverse("patient-detail", kwargs={"pk": patient.id})
        response = self.client.get(url)

        self.assertEqual(404, response.status_code)


    # ---------------------------------------------
    # Superadmin Tests (should see nothing)
    # ---------------------------------------------
    def test_superadmin_sees_no_patients(self):
        Patient.objects.create(
            full_name="Hidden",
            phone_number="1",
            gender="female",
            created_by=self.nurse
        )

        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.list_url)
        self.assertEqual(response.data.get("results", []), [])

    # 

  