import os
import json
from groq import Groq
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class GroqRecommendationService:
    """Service for generating clinical recommendations using Groq LLM"""
    
    # Model selection - llama-3.3-70b-versatile is fast and capable
    MODEL = "llama-3.3-70b-versatile"
    
    def __init__(self):
        """Initialize Groq API with API key from settings"""
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not found in settings. "
                "Please add it to your .env file: GROQ_API_KEY=your_key_here"
            )
        
        self.client = Groq(api_key=api_key)
        self.model_version = self.MODEL
    
    def generate_recommendation(
        self,
        her2_status: str,
        confidence: float,
        risk_level: str,
        risk_score: float,
        probabilities: dict,
        clinical_notes: str = "",
        patient_history: str = ""
    ) -> dict:
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
        
        # Build the system and user prompts
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(
            her2_status=her2_status,
            confidence=confidence,
            risk_level=risk_level,
            risk_score=risk_score,
            probabilities=probabilities,
            clinical_notes=clinical_notes,
            patient_history=patient_history
        )
        
        try:
            logger.info(f"Generating recommendation with Groq ({self.MODEL})...")
            
            # Call Groq API
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.MODEL,
                temperature=0.3,  # Lower for more consistent clinical output
                max_completion_tokens=2048,
                top_p=0.9,
                response_format={"type": "json_object"},  # Force JSON response
            )
            
            # Extract response
            response_text = chat_completion.choices[0].message.content
            
            # Parse the response
            recommendation = self._parse_response(response_text)
            recommendation['model_version'] = self.model_version
            
            logger.info("Recommendation generated successfully")
            return recommendation
            
        except Exception as e:
            logger.error(f"Groq API error: {str(e)}")
            raise RuntimeError(f"Failed to generate recommendation: {str(e)}")
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for Groq LLM"""
        return """You are an expert Clinical Decision Support Assistant specializing in breast cancer oncology.

Your role is to provide evidence-based clinical recommendations to healthcare professionals based on HER2 AI predictions.

CRITICAL SAFETY REQUIREMENTS (include in every response):
1. AI predictions are assistive tools, NOT diagnostic conclusions
2. All treatment decisions require HER2 confirmation via IHC ± ISH testing
3. AI predictions may contain errors and must be validated
4. The treating oncologist must approve all recommendations before implementation

You must ALWAYS respond with valid JSON in this exact format:
{
  "clinical_assessment": "A comprehensive assessment paragraph",
  "treatment_recommendations": ["recommendation 1", "recommendation 2", ...],
  "followup_schedule": ["follow-up item 1", "follow-up item 2", ...],
  "risk_mitigation": ["risk mitigation strategy 1", "strategy 2", ...]
}"""

    def _build_user_prompt(
        self,
        her2_status: str,
        confidence: float,
        risk_level: str,
        risk_score: float,
        probabilities: dict,
        clinical_notes: str,
        patient_history: str
    ) -> str:
        """Build the user prompt with patient data"""
        
        # Determine confidence level description
        if confidence >= 0.90:
            confidence_desc = "HIGH CONFIDENCE"
        elif confidence >= 0.75:
            confidence_desc = "MODERATE CONFIDENCE"
        else:
            confidence_desc = "LOW CONFIDENCE - Additional testing strongly recommended"
        
        prompt = f"""Generate clinical recommendations for the following HER2 breast cancer case.

═══════════════════════════════════════
AI PREDICTION RESULTS
═══════════════════════════════════════
HER2 Status (AI Prediction): {her2_status}
Confidence Level: {confidence:.1%} ({confidence_desc})
Risk Classification: {risk_level.upper()}
Risk Score: {risk_score:.1f}/100

Probability Distribution:
• HER2 0 (Negative): {probabilities.get('HER2_0', 0):.1%}
• HER2 1+ (Low): {probabilities.get('HER2_1+', 0):.1%}
• HER2 2+ (Equivocal): {probabilities.get('HER2_2+', 0):.1%}
• HER2 3+ (Positive): {probabilities.get('HER2_3+', 0):.1%}

═══════════════════════════════════════
CLINICAL CONTEXT
═══════════════════════════════════════
Clinical Notes from Physician:
{clinical_notes if clinical_notes else "No clinical notes provided."}

Patient History:
{patient_history if patient_history else "No patient history available."}

═══════════════════════════════════════
RECOMMENDATION REQUIREMENTS
═══════════════════════════════════════

Please provide:

1. **Clinical Assessment**: 
   - Interpret the AI prediction in clinical context
   - Note confidence level implications
   - Recommend confirmatory testing if needed

2. **Treatment Recommendations** (3-5 items):
   - Tailor to HER2 status category:
     • HER2 0: Standard non-HER2 targeted therapy pathways
     • HER2 1+/Low: Consider HER2-low targeted options (e.g., T-DXd if eligible)
     • HER2 2+: Emphasize ISH/FISH confirmation before HER2 therapy
     • HER2 3+: HER2-targeted therapy pathway PENDING confirmation
   - Include safety caveats for each recommendation
   - Reference current NCCN/ASCO guidelines where applicable

3. **Follow-up Schedule** (3-4 items):
   - Confirmatory testing timeline
   - Monitoring intervals
   - Reassessment points

4. **Risk Mitigation Strategies** (3-4 items):
   - Address prediction uncertainty
   - Safeguards against misdiagnosis
   - Quality assurance steps

IMPORTANT: 
- If confidence < 85%, strongly recommend additional pathology review
- Every treatment suggestion must include "pending IHC/ISH confirmation"
- End assessment with: "Final treatment decisions rest with the treating oncologist."

Respond with JSON only."""

        return prompt
    
    def _parse_response(self, response_text: str) -> dict:
        """Parse Groq response and extract structured data"""
        
        try:
            # Clean the response text
            json_str = response_text.strip()
            
            # Handle potential markdown code blocks
            if '```json' in json_str:
                start = json_str.find('```json') + 7
                end = json_str.find('```', start)
                json_str = json_str[start:end].strip()
            elif '```' in json_str:
                start = json_str.find('```') + 3
                end = json_str.find('```', start)
                json_str = json_str[start:end].strip()
            
            # Parse JSON
            data = json.loads(json_str)
            
            # Validate and normalize structure
            required_keys = [
                'clinical_assessment',
                'treatment_recommendations',
                'followup_schedule',
                'risk_mitigation'
            ]
            
            for key in required_keys:
                if key not in data:
                    raise ValueError(f"Missing required key: {key}")
                
                # Ensure lists are actually lists
                if key != 'clinical_assessment' and not isinstance(data[key], list):
                    data[key] = [data[key]] if data[key] else []
            
            # Ensure clinical_assessment is a string
            if isinstance(data['clinical_assessment'], list):
                data['clinical_assessment'] = ' '.join(data['clinical_assessment'])
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Groq response as JSON: {e}")
            logger.error(f"Response text: {response_text[:500]}...")
            
            # Fallback: return raw text in a structured format
            return {
                'clinical_assessment': (
                    f"Unable to parse structured response. Raw output: {response_text[:500]}... "
                    "Please review and consult with oncology team."
                ),
                'treatment_recommendations': [
                    " Automated parsing failed - manual review required",
                    "Confirm HER2 status with IHC ± ISH testing",
                    "Schedule multidisciplinary tumor board review",
                    "Consult with pathology for additional assessment"
                ],
                'followup_schedule': [
                    "Immediate: Request confirmatory HER2 testing",
                    "Within 1 week: Pathology review completion",
                    "Within 2 weeks: Treatment planning conference"
                ],
                'risk_mitigation': [
                    "Do not initiate treatment based on AI prediction alone",
                    "Obtain second pathologist opinion if results are equivocal",
                    "Document all AI-assisted decisions in patient record"
                ]
            }
        except Exception as e:
            logger.error(f"Error parsing Groq response: {e}")
            raise


# Singleton instance (lazy initialization)
_groq_service_instance = None

def get_groq_service():
    """Get or create the Groq service singleton"""
    global _groq_service_instance
    if _groq_service_instance is None:
        _groq_service_instance = GroqRecommendationService()
    return _groq_service_instance

# For backward compatibility
groq_service = None
try:
    groq_service = get_groq_service()
except ValueError as e:
    logger.warning(f"Groq service not initialized: {e}")
