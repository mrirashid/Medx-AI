from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class UserAPITest(APITestCase):

    def setUp(self):
        # Superadmin for authentication
        self.superadmin = User.objects.create_superuser(
            email="admin_test@example.com",
            password="Admin12345",
            full_name="Admin Test"
        )
        self.client.force_authenticate(user=self.superadmin)

        # Correct router names
        self.list_url = reverse("user-list")       # /users/
        self.create_url = reverse("user-list")     # POST /users/

    
    # 1) Create user
    
    def test_create_user_success(self):
        data = {
            "full_name": "Nurse A",
            "email": "nurseA@example.com",
            "password": "StrongPass1",
            "role": "nurse",
        }
        response = self.client.post(self.create_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="nurseA@example.com").exists())

    
    # 2) Duplicate email
    
    def test_create_user_duplicate_email(self):
        User.objects.create_user(
            email="duplicate@example.com",
            full_name="Existing",
            password="pass123",
            role="doctor",
        )

        data = {
            "full_name": "New User",
            "email": "duplicate@example.com",
            "password": "abc12345",
            "role": "doctor",
        }
        response = self.client.post(self.create_url, data, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    
    # 3) List users
    
    def test_list_users(self):
        User.objects.create_user(
            email="doctor_test@example.com",
            full_name="Doctor Test",
            password="pass123",
            role="doctor",
        )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 1)

    
    # 4) Retrieve user
    
    def test_retrieve_user(self):
        user = User.objects.create_user(
            email="retrieve@example.com",
            full_name="Retrieve User",
            password="pass123",
            role="nurse",
        )

        url = reverse("user-detail", kwargs={"pk": user.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "retrieve@example.com")

    
    # 5) Update user
    
    def test_update_user(self):
        user = User.objects.create_user(
            email="update@example.com",
            full_name="Old Name",
            password="pass123",
            role="doctor",
        )

        url = reverse("user-detail", kwargs={"pk": user.id})
        data = {"full_name": "Updated Name", "role": "doctor"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        self.assertEqual(user.full_name, "Updated Name")

    
    # 6) Soft delete user
    
    def test_soft_delete_user(self):
        user = User.objects.create_user(
            email="delete@example.com",
            full_name="Delete Me",
            password="pass123",
            role="nurse",
        )

        url = reverse("user-detail", kwargs={"pk": user.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_deleted)

    
    # 7) Hard delete user
    
    def test_hard_delete_user(self):
        user = User.objects.create_user(
            email="harddelete@example.com",
            full_name="Hard Delete",
            password="pass123",
            role="nurse",
        )

        url = reverse("user-hard-delete", kwargs={"pk": user.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(email="harddelete@example.com").exists())



   
    # 8) Nurse cannot list users (admin-only)
   
    def test_nurse_cannot_list_users(self):
        nurse = User.objects.create_user(
            email="nurse_perm@example.com",
            full_name="Nurse Perm",
            password="pass123",
            role="nurse",
        )

        # switch client auth to nurse
        self.client.force_authenticate(user=nurse)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

   
    # 9) Doctor cannot create users (admin-only)
   
    def test_doctor_cannot_create_user(self):
        doctor = User.objects.create_user(
            email="doctor_perm@example.com",
            full_name="Doctor Perm",
            password="pass123",
            role="doctor",
        )

        self.client.force_authenticate(user=doctor)

        data = {
            "full_name": "New User",
            "email": "newuser@example.com",
            "password": "StrongPass1",
            "role": "nurse",
        }
        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email="newuser@example.com").exists())

   
    # 10) Nurse can view ONLY own profile
   
    def test_nurse_can_view_self_but_not_others(self):
        # create nurse and another doctor
        nurse = User.objects.create_user(
            email="nurse_self@example.com",
            full_name="Nurse Self",
            password="pass123",
            role="nurse",
        )
        other = User.objects.create_user(
            email="other@example.com",
            full_name="Other User",
            password="pass123",
            role="doctor",
        )

        self.client.force_authenticate(user=nurse)

        # can view own profile
        own_url = reverse("user-detail", kwargs={"pk": nurse.id})
        own_response = self.client.get(own_url)
        self.assertEqual(own_response.status_code, status.HTTP_200_OK)
        self.assertEqual(own_response.data["email"], "nurse_self@example.com")

        #  cannot view someone else
        other_url = reverse("user-detail", kwargs={"pk": other.id})
        other_response = self.client.get(other_url)
        self.assertEqual(other_response.status_code, status.HTTP_403_FORBIDDEN)

   
    # 11) Nurse cannot soft / hard delete others

    def test_nurse_cannot_delete_other_user(self):
        nurse = User.objects.create_user(
            email="nurse_delete@example.com",
            full_name="Nurse Delete",
            password="pass123",
            role="nurse",
        )
        victim = User.objects.create_user(
            email="victim@example.com",
            full_name="Victim User",
            password="pass123",
            role="doctor",
        )

        self.client.force_authenticate(user=nurse)

        # default DELETE (soft delete)
        url = reverse("user-detail", kwargs={"pk": victim.id})
        resp_soft = self.client.delete(url)
        self.assertEqual(resp_soft.status_code, status.HTTP_403_FORBIDDEN)
        victim.refresh_from_db()
        self.assertFalse(victim.is_deleted)

        # hard delete action
        hard_url = reverse("user-hard-delete", kwargs={"pk": victim.id})
        resp_hard = self.client.delete(hard_url)
        self.assertEqual(resp_hard.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=victim.id).exists())

