from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.cases.models import Case
from apps.patients.models import Patient

User = get_user_model()


class CaseAPITest(APITestCase):
    """
    Test Cases CRUD + RBAC:
    - Doctor: full CRUD for cases of their assigned patients
    - Nurse: no access (403)
    - Superadmin: no access (403)
    - Anonymous: no access (401)
    """

    def setUp(self):
        # Create users
        self.doctor1 = User.objects.create_user(
            email="doctor1@test.com",
            password="DocPass123",
            full_name="Dr. Ahmad",
            role="doctor"
        )
        
        self.doctor2 = User.objects.create_user(
            email="doctor2@test.com",
            password="DocPass123",
            full_name="Dr. Sarah",
            role="doctor"
        )
        
        self.nurse = User.objects.create_user(
            email="nurse@test.com",
            password="NursePass123",
            full_name="Nurse Aisha",
            role="nurse"
        )
        
        self.superadmin = User.objects.create_superuser(
            email="admin@test.com",
            password="AdminPass123",
            full_name="Admin User"
        )

        # Create patients
        self.patient1 = Patient.objects.create(
            full_name="Patient One",
            phone_number="0123456789",
            gender="female",
            assigned_doctor=self.doctor1,
            created_by=self.nurse
        )
        
        self.patient2 = Patient.objects.create(
            full_name="Patient Two",
            phone_number="0123456788",
            gender="male",
            assigned_doctor=self.doctor2,
            created_by=self.nurse
        )

        # Create cases
        self.case1 = Case.objects.create(
            patient=self.patient1,
            created_by=self.doctor1,
            status=Case.Status.DRAFT
        )
        
        self.case2 = Case.objects.create(
            patient=self.patient2,
            created_by=self.doctor2,
            status=Case.Status.IN_PROGRESS
        )

        # URLs
        self.list_url = reverse("case-list")
        self.detail_url = lambda pk: reverse("case-detail", kwargs={"pk": pk})

    # -------------------------
    # 1) Test Anonymous Access (401)
    # -------------------------
    def test_anonymous_cannot_list_cases(self):
        """Anonymous user gets 401"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_create_case(self):
        """Anonymous user cannot create case"""
        data = {"patient": str(self.patient1.id), "status": "draft"}
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------
    # 2) Test Nurse Access (403)
    # -------------------------
    def test_nurse_cannot_list_cases(self):
        """Nurse gets 403 when trying to list cases"""
        self.client.force_authenticate(user=self.nurse)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nurse_cannot_create_case(self):
        """Nurse cannot create cases"""
        self.client.force_authenticate(user=self.nurse)
        data = {"patient": str(self.patient1.id), "status": "draft"}
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nurse_cannot_retrieve_case(self):
        """Nurse cannot view case details"""
        self.client.force_authenticate(user=self.nurse)
        response = self.client.get(self.detail_url(self.case1.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nurse_cannot_update_case(self):
        """Nurse cannot update cases"""
        self.client.force_authenticate(user=self.nurse)
        data = {"status": "complete"}
        response = self.client.patch(
            self.detail_url(self.case1.id), 
            data, 
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nurse_cannot_delete_case(self):
        """Nurse cannot delete cases"""
        self.client.force_authenticate(user=self.nurse)
        response = self.client.delete(self.detail_url(self.case1.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------
    # 3) Test Superadmin Access (403)
    # -------------------------
    def test_superadmin_cannot_access_cases(self):
        """Superadmin has no access to cases"""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------
    # 4) Test Doctor - List Cases
    # -------------------------
    def test_doctor_can_list_own_patient_cases(self):
        """Doctor sees only cases for their assigned patients"""
        self.client.force_authenticate(user=self.doctor1)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle pagination
        results = response.data.get("results", response.data)
        
        # Doctor1 should see only case1
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.case1.id))
        self.assertEqual(results[0]["case_code"], self.case1.case_code)
        self.assertEqual(results[0]["patient_name"], "Patient One")

    def test_doctor_cannot_see_other_doctor_cases(self):
        """Doctor cannot see cases for patients not assigned to them"""
        self.client.force_authenticate(user=self.doctor1)
        
        # Try to retrieve doctor2's case - should return 404 (not 403 per RBAC spec)
        response = self.client.get(self.detail_url(self.case2.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------
    # 5) Test Doctor - Create Case
    # -------------------------
    def test_doctor_can_create_case_for_assigned_patient(self):
        """Doctor can create case for their assigned patient"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {
            "patient": str(self.patient1.id),
            "status": Case.Status.DRAFT
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["patient"]), str(self.patient1.id))
        self.assertEqual(response.data["status"], Case.Status.DRAFT)
        
        # Verify case_code auto-generated
        self.assertIsNotNone(response.data.get("case_code"))
        self.assertTrue(response.data["case_code"].startswith(self.patient1.patient_code))
        
        # Verify created_by is set
        case = Case.objects.get(id=response.data["id"])
        self.assertEqual(case.created_by, self.doctor1)

    def test_doctor_cannot_create_case_for_unassigned_patient(self):
        """Doctor cannot create case for patient not assigned to them"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {
            "patient": str(self.patient2.id),  # Assigned to doctor2
            "status": Case.Status.DRAFT
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", response.data)

    # -------------------------
    # 6) Test Doctor - Retrieve Case
    # -------------------------
    def test_doctor_can_retrieve_own_case(self):
        """Doctor can retrieve details of their patient's case"""
        self.client.force_authenticate(user=self.doctor1)
        
        response = self.client.get(self.detail_url(self.case1.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.case1.id))
        self.assertEqual(response.data["case_code"], self.case1.case_code)
        self.assertEqual(response.data["patient_name"], "Patient One")
        self.assertEqual(response.data["doctor_name"], "Dr. Ahmad")
        self.assertEqual(response.data["status"], Case.Status.DRAFT)
        self.assertFalse(response.data["has_prediction"])
        self.assertFalse(response.data["has_recommendation"])

    # -------------------------
    # 7) Test Doctor - Update Case
    # -------------------------
    def test_doctor_can_update_own_case(self):
        """Doctor can update status of their case"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {"status": Case.Status.IN_PROGRESS}
        
        response = self.client.patch(
            self.detail_url(self.case1.id), 
            data, 
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Case.Status.IN_PROGRESS)
        
        # Verify in DB
        self.case1.refresh_from_db()
        self.assertEqual(self.case1.status, Case.Status.IN_PROGRESS)

    def test_doctor_cannot_update_other_doctor_case(self):
        """Doctor cannot update case of another doctor's patient"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {"status": Case.Status.COMPLETE}
        
        response = self.client.patch(
            self.detail_url(self.case2.id), 
            data, 
            format="json"
        )
        
        # Should return 404 (not 403, per RBAC to avoid leaking existence)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------
    # 8) Test Doctor - Soft Delete Case
    # -------------------------
    def test_doctor_can_soft_delete_own_case(self):
        """Doctor can soft-delete their case"""
        self.client.force_authenticate(user=self.doctor1)
        
        response = self.client.delete(self.detail_url(self.case1.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("soft-deleted", response.data["detail"].lower())
        
        # Verify soft-delete (still in DB but is_deleted=True)
        self.case1.refresh_from_db()
        self.assertTrue(self.case1.is_deleted)
        
        # Verify not in default queryset
        self.assertFalse(
            Case.objects.filter(id=self.case1.id).exists()
        )
        
        # Verify still in _base_manager
        self.assertTrue(
            Case._base_manager.filter(id=self.case1.id).exists()
        )

    def test_doctor_cannot_delete_other_doctor_case(self):
        """Doctor cannot delete another doctor's case"""
        self.client.force_authenticate(user=self.doctor1)
        
        response = self.client.delete(self.detail_url(self.case2.id))
        
        # Should return 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify case2 not deleted
        self.case2.refresh_from_db()
        self.assertFalse(self.case2.is_deleted)

    # -------------------------
    # 9) Test Case Code Generation
    # -------------------------
    def test_case_code_auto_generated(self):
        """Case code is auto-generated on save"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {
            "patient": str(self.patient1.id),
            "status": Case.Status.DRAFT
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        case_code = response.data["case_code"]
        self.assertIsNotNone(case_code)
        
        # Format: {PATIENT_CODE}-{COUNT}
        # Should be BR-2025-XXXX-002 (since case1 already exists for patient1)
        self.assertTrue(case_code.startswith(self.patient1.patient_code))
        self.assertTrue(case_code.endswith("-002"))

    def test_case_code_increments_after_soft_delete(self):
        """Case code increments correctly even after soft-delete"""
        self.client.force_authenticate(user=self.doctor1)
        
        # Soft-delete existing case
        self.case1.delete()
        
        # Create new case for same patient
        data = {
            "patient": str(self.patient1.id),
            "status": Case.Status.DRAFT
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should be -002 (counting soft-deleted case1)
        case_code = response.data["case_code"]
        self.assertTrue(case_code.endswith("-002"))

    # -------------------------
    # 10) Test Serializer Fields
    # -------------------------
    def test_case_list_serializer_fields(self):
        """CaseListSerializer returns correct fields"""
        self.client.force_authenticate(user=self.doctor1)
        
        response = self.client.get(self.list_url)
        results = response.data.get("results", response.data)
        
        case = results[0]
        
        # Verify all expected fields present
        expected_fields = [
            "id", "case_code", "patient_code", "patient_name",
            "doctor_name", "has_prediction", "has_recommendation",
            "status", "created_at"
        ]
        
        for field in expected_fields:
            self.assertIn(field, case)
        
        # Verify computed fields
        self.assertEqual(case["patient_code"], self.patient1.patient_code)
        self.assertEqual(case["patient_name"], "Patient One")
        self.assertEqual(case["doctor_name"], "Dr. Ahmad")

    def test_case_detail_serializer_read_only_fields(self):
        """CaseDetailSerializer has correct read-only fields"""
        self.client.force_authenticate(user=self.doctor1)
        
        # Try to update read-only fields
        data = {
            "case_code": "HACK-123",
            "has_prediction": True,
            "has_recommendation": True,
            "status": Case.Status.COMPLETE
        }
        
        response = self.client.patch(
            self.detail_url(self.case1.id), 
            data, 
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify read-only fields not changed
        self.case1.refresh_from_db()
        self.assertNotEqual(self.case1.case_code, "HACK-123")
        self.assertFalse(self.case1.has_prediction)
        self.assertFalse(self.case1.has_recommendation)
        
        # Verify allowed field changed
        self.assertEqual(self.case1.status, Case.Status.COMPLETE)

    # -------------------------
    # 11) Test Edge Cases
    # -------------------------
    def test_soft_deleted_case_not_in_list(self):
        """Soft-deleted cases don't appear in list"""
        self.client.force_authenticate(user=self.doctor1)
        
        # Soft-delete case
        self.case1.delete()
        
        response = self.client.get(self.list_url)
        results = response.data.get("results", response.data)
        
        # Should be empty now
        self.assertEqual(len(results), 0)

    def test_soft_deleted_case_returns_404(self):
        """Soft-deleted case returns 404 on retrieve"""
        self.client.force_authenticate(user=self.doctor1)
        
        # Soft-delete case
        self.case1.delete()
        
        response = self.client.get(self.detail_url(self.case1.id))
        
        # Should return 404 (not in default queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_case_with_invalid_status(self):
        """Cannot create case with invalid status"""
        self.client.force_authenticate(user=self.doctor1)
        
        data = {
            "patient": str(self.patient1.id),
            "status": "invalid_status"
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_create_case_with_nonexistent_patient(self):
        """Cannot create case for non-existent patient"""
        self.client.force_authenticate(user=self.doctor1)
        
        import uuid
        fake_uuid = str(uuid.uuid4())
        
        data = {
            "patient": fake_uuid,
            "status": Case.Status.DRAFT
        }
        
        response = self.client.post(self.list_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", response.data)
