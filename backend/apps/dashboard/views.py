from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.users.models import User
from apps.patients.models import Patient
from apps.cases.models import Case
from apps.ai.models import HER2Prediction
from apps.recommendation.models import ClinicalRecommendation
from apps.activities.models import Activity


class SuperadminDashboardView(APIView):
    """Dashboard statistics for Superadmin"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user is superadmin
        if request.user.role != 'superadmin':
            return Response({'error': 'Unauthorized'}, status=403)
        
        # Date ranges
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        # Total users by role
        total_users = User.objects.count()
        total_doctors = User.objects.filter(role='doctor').count()
        total_nurses = User.objects.filter(role='nurse').count()
        
        # Active cases
        active_cases = Case.objects.filter(is_deleted=False).count()
        
        # User role distribution
        role_distribution = {
            'doctors': total_doctors,
            'nurses': total_nurses,
            'superadmins': User.objects.filter(role='superadmin').count()
        }
        
        # Recent activities (last 10)
        recent_activities = Activity.objects.all()[:10]
        activities_data = [
            {
                'id': str(activity.id),
                'user_name': activity.user.full_name if activity.user else 'System',
                'user_role': activity.user.role if activity.user else None,
                'action': activity.action,
                'entity_type': activity.entity_type,
                'description': activity.description,
                'created_at': activity.created_at,
            }
            for activity in recent_activities
        ]
        
        # User growth (last 7 days)
        user_growth = []
        for i in range(7):
            date = today - timedelta(days=6-i)
            count = User.objects.filter(
                created_at__date__lte=date
            ).count()
            user_growth.append({
                'date': date.strftime('%a'),
                'count': count
            })
        
        return Response({
            'total_users': total_users,
            'total_doctors': total_doctors,
            'total_nurses': total_nurses,
            'active_cases': active_cases,
            'role_distribution': role_distribution,
            'recent_activities': activities_data,
            'user_growth': user_growth,
        })


class DoctorDashboardView(APIView):
    """Dashboard statistics for Doctor"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user is doctor
        if request.user.role != 'doctor':
            return Response({'error': 'Unauthorized'}, status=403)
        
        # Date ranges
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        # Get all non-deleted cases for this doctor's patients
        doctor_cases = Case.objects.filter(
            patient__assigned_doctor=request.user,
            is_deleted=False
        )
        
        total_cases = doctor_cases.count()
        
        cases_this_week = doctor_cases.filter(
            created_at__date__gte=week_start
        ).count()
        
        # Active cases (not completed/cancelled)
        active_cases = doctor_cases.exclude(
            status__in=['complete', 'cancelled']
        ).count()
        
        # Risk level distribution - count UNIQUE cases by their risk level
        # First, update cases that don't have risk_level set but have predictions
        for case in doctor_cases.filter(risk_level__isnull=True):
            latest_pred = HER2Prediction.objects.filter(
                case=case,
                is_deleted=False
            ).order_by('-created_at').first()
            if latest_pred and latest_pred.risk_level:
                case.risk_level = latest_pred.risk_level
                case.save(update_fields=['risk_level'])
        
        # Now count by case risk_level (each case counted once)
        risk_distribution = doctor_cases.values('risk_level').annotate(
            count=Count('id')
        )
        
        risk_data = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        for item in risk_distribution:
            risk_level = (item['risk_level'] or 'low').lower()
            if risk_level in risk_data:
                risk_data[risk_level] = item['count']
        
        total_predictions = HER2Prediction.objects.filter(
            case__patient__assigned_doctor=request.user,
            case__is_deleted=False,
            is_deleted=False
        ).count()
        
        # Count pending (draft) recommendations for this doctor's cases
        pending_recommendations = ClinicalRecommendation.objects.filter(
            case__patient__assigned_doctor=request.user,
            case__is_deleted=False,
            is_deleted=False,
            status='draft'
        ).count()
        
        # Daily case counts for the last 7 days (for the trend graph)
        daily_cases = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            count = doctor_cases.filter(created_at__date=day).count()
            daily_cases.append({
                'date': day.strftime('%Y-%m-%d'),
                'day_name': 'Today' if i == 0 else day.strftime('%a'),
                'count': count
            })
        
        # Recent cases (last 5)
        recent_cases = doctor_cases.select_related('patient').order_by('-created_at')[:5]
        
        cases_data = [
            {
                'id': str(case.id),
                'case_code': case.case_code,
                'patient': str(case.patient.id) if case.patient else None,
                'patient_name': case.patient.full_name if case.patient else 'Unknown',
                'patient_code': case.patient.patient_code if case.patient else '',
                'risk_level': self._get_case_risk_level(case),
                'status': case.status,
                'has_prediction': case.has_prediction,
                'has_recommendation': case.has_recommendation,
                'created_at': case.created_at,
            }
            for case in recent_cases
        ]
        
        return Response({
            'total_cases': total_cases,
            'cases_this_week': cases_this_week,
            'active_cases': active_cases,
            'risk_distribution': risk_data,
            'total_predictions': total_predictions,
            'pending_recommendations': pending_recommendations,
            'daily_cases': daily_cases,
            'recent_cases': cases_data,
        })
    
    def _get_case_risk_level(self, case):
        """Get the latest prediction risk level for a case"""
        # First check if case has risk_level stored directly
        if case.risk_level:
            return case.risk_level
        
        # Fallback to getting from latest prediction
        latest_prediction = HER2Prediction.objects.filter(
            case=case,
            is_deleted=False
        ).order_by('-created_at').first()
        
        return latest_prediction.risk_level if latest_prediction else None


class NurseDashboardView(APIView):
    """Dashboard statistics for Nurse"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user is nurse
        if request.user.role != 'nurse':
            return Response({'error': 'Unauthorized'}, status=403)
        
        # Date ranges
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        # Total patients (all patients in the system)
        total_patients = Patient.objects.filter(
            is_deleted=False
        ).count()
        
        patients_added_today = Patient.objects.filter(
            created_at__date=today,
            is_deleted=False
        ).count()
        
        patients_added_this_week = Patient.objects.filter(
            created_at__date__gte=week_start,
            is_deleted=False
        ).count()
        
        # Patient age distribution (all patients)
        patients = Patient.objects.filter(
            is_deleted=False
        )
        
        age_distribution = {
            '0-20': 0,
            '21-40': 0,
            '41-60': 0,
            '60+': 0
        }
        
        # Gender distribution
        gender_distribution = {
            'male': 0,
            'female': 0,
            'other': 0
        }
        
        for patient in patients:
            age = self._calculate_age(patient.dob) if patient.dob else 0
            if age is None or age <= 20:
                age_distribution['0-20'] += 1
            elif age <= 40:
                age_distribution['21-40'] += 1
            elif age <= 60:
                age_distribution['41-60'] += 1
            else:
                age_distribution['60+'] += 1
            
            # Count gender
            gender = (patient.gender or 'other').lower()
            if gender in gender_distribution:
                gender_distribution[gender] += 1
            else:
                gender_distribution['other'] += 1
        
        # Recent profile activity
        recent_activities = Activity.objects.filter(
            user=request.user,
            entity_type=Activity.ENTITY_PATIENT
        ).order_by('-created_at')[:5]
        
        activities_data = [
            {
                'id': str(activity.id),
                'description': activity.description,
                'created_at': activity.created_at,
            }
            for activity in recent_activities
        ]
        
        return Response({
            'total_patients': total_patients,
            'patients_added_today': patients_added_today,
            'patients_added_this_week': patients_added_this_week,
            'age_distribution': age_distribution,
            'gender_distribution': gender_distribution,
            'recent_activities': activities_data,
        })
    
    def _calculate_age(self, date_of_birth):
        """Calculate age from date of birth"""
        if not date_of_birth:
            return 0
        today = timezone.now().date()
        return today.year - date_of_birth.year - (
            (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
        )
