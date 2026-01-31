import os
import json
import google.generativeai as genai
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class GeminiRecommendationService:
    """Service for generating clinical recommendations using Gemini LLM"""
    
    def __init__(self):
        """Initialize Gemini API with API key from settings"""
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in settings. "
                "Please add it to your .env file: GEMINI_API_KEY=your_key_here"
            )
        
        genai.configure(api_key=api_key)
        
        self.model = genai.GenerativeModel('gemini-2.0-flash-001')
        self.model_version = 'gemini-2.0-flash-001'
    
    def generate_recommendation(
        self,
        her2_status,
        confidence,
        risk_level,
        risk_score,
        probabilities,
        clinical_notes="",
        patient_history=""
    ):
        """
        Generate clinical recommendations based on HER2 prediction + patient context
        
        Args:
            her2_status: HER2 classification (HER2_0, HER2_1+, HER2_2+, HER2_3+)
            confidence: Model confidence (0.0-1.0)
            risk_level: Risk assessment (low, medium, high, critical)
            risk_score: Numerical risk score (0-100)
            probabilities: Dict of all class probabilities
            clinical_notes: Doctor's observations
            patient_history: Patient medical history text
            
        Returns:
            dict: Structured recommendation with assessment, treatments, follow-up, risk mitigation
        """
        
        # Build the prompt
        prompt = self._build_prompt(
            her2_status=her2_status,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            probabilities=probabilities,
            clinical_notes=clinical_notes,
            patient_history=patient_history
        )
        
        try:
            logger.info("Generating recommendation with Gemini LLM...")
            
            # Call Gemini API
            response = self.model.generate_content(prompt)
            
            # Parse the response
            recommendation = self._parse_response(response.text)
            recommendation['model_version'] = self.model_version
            
            logger.info("Recommendation generated successfully")
            return recommendation
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise RuntimeError(f"Failed to generate recommendation: {str(e)}")
    
    def _build_prompt(
        self,
        her2_status,
        confidence,
        risk_level,
        risk_score,
        probabilities,
        clinical_notes,
        patient_history
    ):
        """Build the prompt for Gemini LLM"""
        
        prompt = f"""
You are a Clinical Decision Support Assistant specializing in breast cancer.
You CAN provide treatment advice, follow-up plans, and clinical guidance,
but you MUST explicitly state that:

- AI predictions are NOT diagnostic.
- All treatment decisions require HER2 confirmation using IHC ± ISH.
- AI predictions may contain errors.
- The doctor MUST validate all recommendations before acting.

Your role: 
Give professional oncologist-level recommendations, but with repeated safety reminders.

==========================
AI PREDICTION SUMMARY
==========================
HER2 Status (AI guess): {her2_status}
Model Confidence: {confidence:.1%}
Risk Level: {risk_level.upper()}
Risk Score: {risk_score:.1f}/100

Class Probabilities:
- HER2 0: {probabilities.get('HER2_0', 0):.1%}
- HER2 1+: {probabilities.get('HER2_1+', 0):.1%}
- HER2 2+: {probabilities.get('HER2_2+', 0):.1%}
- HER2 3+: {probabilities.get('HER2_3+', 0):.1%}

Clinical Notes:
{clinical_notes if clinical_notes else "No clinical notes provided."}

Patient History:
{patient_history if patient_history else "No patient history provided."}

==========================
YOUR INSTRUCTIONS
==========================

1. Provide:
   - a clinical assessment
   - treatment recommendations
   - follow-up plan
   - risk-mitigation strategies  

2. You ARE allowed to suggest treatment paths such as:
   - endocrine therapy
   - HER2-targeted therapy
   - chemotherapy options
   - clinical trials
   - supportive care  
   BUT every recommendation must say:
   **"Only if confirmed by IHC/ISH and approved by the treating oncologist."**

3. Always warn:
   - “Do not rely solely on AI.”
   - “Confirm HER2 status before initiating any targeted treatment.”
   - “AI predictions may be incorrect.”

4. When AI confidence is <85%, recommend:
   - extra testing
   - second pathologist review
   - imaging
   - multidisciplinary decision

5. Tailor recommendations to HER2 category:
   - HER2-0 → standard non-HER2 care  
   - HER2-low → mention new therapies but as optional  
   - HER2-2+ → emphasize ISH confirmation  
   - HER2-3+ → suggest HER2 therapy **only after confirmation**

6. Always end your assessment with:
   “Final decisions must be made by the treating oncologist.”

7. Output MUST be exactly this JSON:
{{
  "clinical_assessment": "",
  "treatment_recommendations": [],
  "followup_schedule": [],
  "risk_mitigation": []
}}

Return ONLY JSON. No extra text.
"""

        
        return prompt
    
    def _parse_response(self, response_text):
        """Parse Gemini response and extract structured data"""
        
        try:
            # Try to find JSON in the response
            # Sometimes Gemini wraps JSON in ```json...``` blocks
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                json_str = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.find('```', start)
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text.strip()
            
            # Parse JSON
            data = json.loads(json_str)
            
            # Validate structure
            required_keys = [
                'clinical_assessment',
                'treatment_recommendations',
                'followup_schedule',
                'risk_mitigation'
            ]
            
            for key in required_keys:
                if key not in data:
                    raise ValueError(f"Missing required key: {key}")
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            
            # Fallback: return raw text in a structured format
            return {
                'clinical_assessment': response_text[:500],
                'treatment_recommendations': [
                    "Unable to parse structured recommendations. Please review the full response."
                ],
                'followup_schedule': [
                    "Immediate follow-up recommended for clarification"
                ],
                'risk_mitigation': [
                    "Consult with oncology team for detailed treatment planning"
                ]
            }
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            raise


# Singleton instance
gemini_service = GeminiRecommendationService()
