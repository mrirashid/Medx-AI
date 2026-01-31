"""
Management command to fix has_prediction and has_recommendation flags on existing cases.
Run with: python manage.py fix_case_flags
"""
from django.core.management.base import BaseCommand
from apps.cases.models import Case
from apps.ai.models import HER2Prediction
from apps.recommendation.models import ClinicalRecommendation


class Command(BaseCommand):
    help = 'Fix has_prediction, has_recommendation, and status on existing cases'

    def handle(self, *args, **options):
        cases = Case.objects.filter(is_deleted=False)
        fixed_count = 0
        
        for case in cases:
            updated = False
            
            # Check for predictions
            has_pred = HER2Prediction.objects.filter(case=case, is_deleted=False).exists()
            if case.has_prediction != has_pred:
                case.has_prediction = has_pred
                updated = True
                self.stdout.write(f"Case {case.case_code}: has_prediction = {has_pred}")
            
            # Get risk level from latest prediction
            if has_pred:
                latest_pred = HER2Prediction.objects.filter(
                    case=case, is_deleted=False
                ).order_by('-created_at').first()
                if latest_pred and case.risk_level != latest_pred.risk_level:
                    case.risk_level = latest_pred.risk_level
                    updated = True
                    self.stdout.write(f"Case {case.case_code}: risk_level = {latest_pred.risk_level}")
            
            # Check for recommendations
            has_rec = ClinicalRecommendation.objects.filter(case=case, is_deleted=False).exists()
            if case.has_recommendation != has_rec:
                case.has_recommendation = has_rec
                updated = True
                self.stdout.write(f"Case {case.case_code}: has_recommendation = {has_rec}")
            
            # Determine correct status based on workflow:
            # - draft: no prediction
            # - in_progress: has prediction but no recommendation
            # - complete: has both prediction and recommendation
            if has_pred and has_rec:
                correct_status = 'complete'
            elif has_pred:
                correct_status = 'in_progress'
            else:
                correct_status = 'draft'
            
            # Update status if needed (don't change cancelled cases)
            if case.status != 'cancelled' and case.status != correct_status:
                old_status = case.status
                case.status = correct_status
                updated = True
                self.stdout.write(f"Case {case.case_code}: status {old_status} -> {correct_status}")
            
            if updated:
                case.save()
                fixed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Fixed {fixed_count} cases out of {cases.count()} total')
        )
