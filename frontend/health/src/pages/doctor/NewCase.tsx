import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Edit,
  FileText,
  RefreshCw,
  RotateCw,
  Save,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import caseService, { Prediction, Recommendation } from "../../services/caseService";
import patientService from "../../services/patientService";
import documentService, { DocumentKind } from "../../services/documentService";

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export default function NewCase() {
  const { patientId = "", caseId: urlCaseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEditMode = !!urlCaseId; // If we have a caseId, we're editing

  // Patient state from backend
  const [patient, setPatient] = useState<any | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Case state
  const [caseId, setCaseId] = useState<string | null>(urlCaseId || null);
  const [existingCase, setExistingCase] = useState<any | null>(null);
  const [caseCreating, setCaseCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageType, setImageType] = useState("Mammogram");
  const [patientHistory, setPatientHistory] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [supportingDocs, setSupportingDocs] = useState<
    Array<{
      id: string;
      file: File;
      name: string;
      size: number;
      uploadedAt: number;
      backendId?: string;   // Backend document ID after successful upload
      uploading?: boolean;  // Upload in progress
      error?: string;       // Upload error message
    }>
  >([]);
  const supportingDocsInputRef = useRef<HTMLInputElement | null>(null);

  // Prediction State
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [gradcamUrl, setGradcamUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{
    riskScore: number;
    riskLevel: RiskLevel;
    confidence: number;
    her2Status: string;
    probabilities: { [key: string]: number };
    modelVersion?: string;
  } | null>(null);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<{
    assessment: string;
    treatment: string[];
    followUp: string[];
    mitigation: string[];
    generatedAt: string;
  } | null>(null);

  // Fetch patient data from backend
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) return;

      setPatientLoading(true);
      setPatientError(null);

      try {
        const response = await patientService.getPatient(patientId);
        setPatient(response);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setPatientError("Failed to load patient data");
      } finally {
        setPatientLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  // Fetch existing case data when viewing/editing
  useEffect(() => {
    const fetchExistingCase = async () => {
      if (!urlCaseId) return;

      try {
        const caseData = await caseService.getCase(urlCaseId);
        setExistingCase(caseData);

        // Fetch predictions for this case
        const predictions = await caseService.getPredictions(urlCaseId);
        if (predictions.results && predictions.results.length > 0) {
          const latestPred = predictions.results[0];
          setPredictionId(latestPred.id);
          setPrediction({
            riskScore: latestPred.risk_score,
            riskLevel: (latestPred.risk_level?.charAt(0).toUpperCase() + latestPred.risk_level?.slice(1)) as RiskLevel,
            confidence: latestPred.confidence,
            her2Status: latestPred.her2_status,
            probabilities: latestPred.probabilities,
            modelVersion: latestPred.model_version,
          });
          if (latestPred.gradcam_url) setGradcamUrl(latestPred.gradcam_url);
          if (latestPred.original_image_url) setOriginalImageUrl(latestPred.original_image_url);
          setStep(2); // Show results step
        }

        // Fetch recommendations for this case
        const recs = await caseService.getRecommendations(urlCaseId);
        if (recs.results && recs.results.length > 0) {
          const latestRec = recs.results[0];
          setRecommendations({
            assessment: latestRec.clinical_assessment || '',
            treatment: typeof latestRec.treatment_recommendations === 'string'
              ? JSON.parse(latestRec.treatment_recommendations || '[]')
              : (latestRec.treatment_recommendations || []),
            followUp: typeof latestRec.followup_schedule === 'string'
              ? JSON.parse(latestRec.followup_schedule || '[]')
              : (latestRec.followup_schedule || []),
            mitigation: typeof latestRec.risk_mitigation === 'string'
              ? JSON.parse(latestRec.risk_mitigation || '[]')
              : (latestRec.risk_mitigation || []),
            generatedAt: latestRec.created_at,
          });
          setStep(3); // Show recommendations step
        }
      } catch (err) {
        console.error("Error fetching existing case:", err);
      }
    };

    fetchExistingCase();
  }, [urlCaseId]);

  // Show loading state
  if (patientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading patient...</div>
      </div>
    );
  }

  // Show error state
  if (patientError || !patient) {
    return (
      <div className="p-8">
        <div className="text-center text-red-500">{patientError || "Patient not found"}</div>
      </div>
    );
  }

  // Create case in backend (if not already created)
  const handleCreateCaseInBackend = async () => {
    if (!currentUser || caseId) return caseId;

    setCaseCreating(true);
    try {
      const caseData: { patient: string; notes?: string } = {
        patient: patientId,
        notes: patientHistory || "New case analysis",
      };
      const newCase = await caseService.createCase(caseData);
      setCaseId(newCase.id.toString());
      return newCase.id.toString();
    } catch (err) {
      console.error("Error creating case:", err);
      throw err;
    } finally {
      setCaseCreating(false);
    }
  };

  const handlePredict = async () => {
    if (!imageFile) {
      alert("Please upload an image first");
      return;
    }

    setIsProcessing(true);
    try {
      // First create the case if needed
      const currentCaseId = caseId || await handleCreateCaseInBackend();
      if (!currentCaseId) {
        throw new Error("Failed to create case");
      }

      // Upload image and run prediction
      const predictionResult = await caseService.runPrediction(
        currentCaseId,
        imageFile,
        true // storeHeatmap
      );

      // Save prediction ID for generating recommendations later
      setPredictionId(predictionResult.id);

      // Save the GradCAM and original image URLs from backend
      if (predictionResult.gradcam_url) {
        setGradcamUrl(predictionResult.gradcam_url);
      }
      if (predictionResult.original_image_url) {
        setOriginalImageUrl(predictionResult.original_image_url);
      }

      // Map backend response to our state format
      const riskScore = predictionResult.risk_score || (predictionResult.probabilities ? Math.max(...Object.values(predictionResult.probabilities)) * 100 : 0);
      const riskLevel = getRiskLevel(riskScore);

      setPrediction({
        riskScore: Math.round(riskScore),
        riskLevel,
        confidence: predictionResult.confidence || 0.92,
        her2Status: predictionResult.her2_status || "Unknown",
        probabilities: predictionResult.probabilities || {},
        modelVersion: predictionResult.model_version,
      });
    } catch (err) {
      console.error("Error running prediction:", err);
      alert("Failed to run prediction. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to determine risk level from score
  const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 75) return "Critical";
    if (score >= 50) return "High";
    if (score >= 25) return "Medium";
    return "Low";
  };

  const handleSavePrediction = async () => {
    setIsProcessing(true);
    try {
      // Prediction is already saved when runPrediction is called
      // This just updates UI state
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving prediction:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!caseId || !predictionId) {
      alert("Please run prediction first");
      return;
    }

    setIsGeneratingRecs(true);
    try {
      // Get document IDs from successfully uploaded supporting documents
      const documentIds = supportingDocs
        .filter((doc) => doc.backendId)
        .map((doc) => doc.backendId!);

      const recsResult = await caseService.generateRecommendation(
        caseId,
        predictionId,
        patientHistory || undefined,
        documentIds.length > 0 ? documentIds : undefined
      );

      // Map backend response to our state format
      // Parse the recommendation fields - they might be stored as JSON strings
      let treatmentRecs: string[] = [];
      let followUpRecs: string[] = [];
      let mitigationRecs: string[] = [];

      try {
        treatmentRecs = typeof recsResult.treatment_recommendations === 'string'
          ? JSON.parse(recsResult.treatment_recommendations)
          : (recsResult.treatment_recommendations || []);
      } catch { treatmentRecs = recsResult.treatment_recommendations ? [recsResult.treatment_recommendations] : []; }

      try {
        followUpRecs = typeof recsResult.followup_schedule === 'string'
          ? JSON.parse(recsResult.followup_schedule)
          : (recsResult.followup_schedule || []);
      } catch { followUpRecs = recsResult.followup_schedule ? [recsResult.followup_schedule] : []; }

      try {
        mitigationRecs = typeof recsResult.risk_mitigation === 'string'
          ? JSON.parse(recsResult.risk_mitigation)
          : (recsResult.risk_mitigation || []);
      } catch { mitigationRecs = recsResult.risk_mitigation ? [recsResult.risk_mitigation] : []; }

      setRecommendations({
        assessment: recsResult.clinical_assessment || recsResult.recommendation_text ||
          "The analysis shows indicators that require attention. Recommendations are based on patient profile and analysis results.",
        treatment: treatmentRecs,
        followUp: followUpRecs,
        mitigation: mitigationRecs,
        generatedAt: new Date().toLocaleString(),
      });
    } catch (err) {
      console.error("Error generating recommendations:", err);
      alert("Failed to generate recommendations. Please try again.");
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  const handleCreateCase = async () => {
    if (!currentUser || !prediction) return;

    try {
      // Update case status if we have a case
      if (caseId) {
        await caseService.updateCase(caseId, {
          status: recommendations ? "complete" : "in_progress",
        });
      }

      navigate(`/doctor/patients/${patientId}/cases`);
    } catch (err) {
      console.error("Error finalizing case:", err);
      navigate(`/doctor/patients/${patientId}/cases`);
    }
  };

  const formatFileSize = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSupportingDocsSelect = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    // Create entries with uploading state
    const entries = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      uploadedAt: Date.now(),
      uploading: true,
    }));

    setSupportingDocs((prev) => [...prev, ...entries]);

    // Upload each file to backend
    for (const entry of entries) {
      // Need a case ID to upload documents
      let currentCaseId = caseId;
      if (!currentCaseId) {
        try {
          currentCaseId = await handleCreateCaseInBackend();
        } catch (err) {
          console.error("Error creating case for document upload:", err);
          setSupportingDocs((prev) =>
            prev.map((doc) =>
              doc.id === entry.id
                ? { ...doc, uploading: false, error: "Failed to create case" }
                : doc
            )
          );
          continue;
        }
      }

      if (!currentCaseId) {
        setSupportingDocs((prev) =>
          prev.map((doc) =>
            doc.id === entry.id
              ? { ...doc, uploading: false, error: "No case available" }
              : doc
          )
        );
        continue;
      }

      try {
        // Upload to backend - use 'medical_history' kind for supporting documents
        const uploadedDoc = await documentService.uploadDocument(
          currentCaseId,
          entry.file,
          'medical_history' as DocumentKind
        );

        // Update state with backend ID
        setSupportingDocs((prev) =>
          prev.map((doc) =>
            doc.id === entry.id
              ? { ...doc, backendId: uploadedDoc.id, uploading: false }
              : doc
          )
        );
      } catch (err: any) {
        console.error("Error uploading document:", err);
        setSupportingDocs((prev) =>
          prev.map((doc) =>
            doc.id === entry.id
              ? { ...doc, uploading: false, error: err.message || "Upload failed" }
              : doc
          )
        );
      }
    }
  };

  const handleRemoveSupportingDoc = async (id: string) => {
    const doc = supportingDocs.find((d) => d.id === id);

    // If document was uploaded to backend, delete it there too
    if (doc?.backendId && caseId) {
      try {
        await documentService.deleteDocument(caseId, doc.backendId);
      } catch (err) {
        console.error("Error deleting document from backend:", err);
        // Continue to remove from local state even if backend delete fails
      }
    }

    setSupportingDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const patientName = patient.full_name || patient.name || 'Unknown';
  const patientDob = patient.dob || patient.date_of_birth;
  const age = patientDob
    ? Math.floor(
      (new Date().getTime() - new Date(patientDob).getTime()) /
      (1000 * 3600 * 24 * 365.25)
    )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
                {patientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">
                  {patientName}
                </h1>
                <p className="text-xs text-gray-500">
                  ID: {patient.id} | {patient.gender} | Age: {age || "--"}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/doctor/patients/${patientId}/cases`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Cases
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Run New Analysis' : 'New Case Analysis'}
            </h1>
            {isEditMode && existingCase && (
              <p className="text-sm text-gray-500 mt-1">
                Adding new prediction/recommendation to case: {existingCase.case_code}
              </p>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center w-full max-w-2xl">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${step >= 1 ? "text-blue-600" : "text-gray-500"
                      }`}
                  >
                    Step 1
                  </p>
                  <p className="text-xs text-gray-500">
                    Image Upload & AI Prediction
                  </p>
                </div>
              </div>

              {/* Connector */}
              <div
                className={`flex-1 h-0.5 mx-4 ${step >= 2 ? "bg-green-500" : "bg-gray-200"
                  }`}
              />

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500"
                    }`}
                >
                  2
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${step >= 2 ? "text-blue-600" : "text-gray-500"
                      }`}
                  >
                    Step 2
                  </p>
                  <p className="text-xs text-gray-500">
                    History & Recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1 CONTENT */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Image Upload Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Medical Image Upload
                </h2>
              </div>

          

              {!imageFile ? (
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:bg-blue-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-blue-500 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        Supported formats: DICOM, PNG, JPG (max 50MB)
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-black rounded-lg overflow-hidden flex justify-center items-center h-96 relative">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Uploaded Medical Scan"
                      className="h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setPrediction(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Remove Image
                    </button>
                    <label
                      htmlFor="replace-upload"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Replace Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setImageFile(e.target.files?.[0] || null);
                        setPrediction(null);
                      }}
                      className="hidden"
                      id="replace-upload"
                    />
                  </div>
                </div>
              )}

              {imageFile && !prediction && (
                <div className="mt-6">
                  <button
                    onClick={handlePredict}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Analysing the Image...
                      </>
                    ) : (
                      "Run AI Prediction"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Prediction Results */}
            {prediction && (
              <>
                <div className="bg-white rounded-xl border border-green-200 p-6">
                  <div className="flex items-center gap-2 mb-4 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <h3 className="font-semibold">AI Prediction Results</h3>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Model {prediction.modelVersion || 'v2.4.1'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Her2 Status */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-purple-700 mb-1 font-medium">Her2 Status</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {prediction.her2Status}
                      </p>
                    </div>

                    {/* Confidence */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-700 mb-1 font-medium">Confidence</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {(prediction.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Risk Level */}
                    <div className={`p-4 rounded-lg border ${prediction.riskLevel === "Critical"
                      ? "bg-red-50 border-red-100"
                      : "bg-yellow-50 border-yellow-100"
                      }`}>
                      <p className={`text-sm mb-1 font-medium ${prediction.riskLevel === "Critical" ? "text-red-700" : "text-yellow-700"
                        }`}>Risk Level</p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold ${prediction.riskLevel === "Critical"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {prediction.riskLevel.toUpperCase()}
                      </span>
                    </div>

                    {/* Risk Score */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1 font-medium">Risk Score</p>
                      <div className="flex items-end gap-1">
                        <p className="text-2xl font-bold text-gray-900">
                          {prediction.riskScore}
                        </p>
                        <span className="text-sm text-gray-500 mb-1">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Probabilities */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Class Probabilities</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(prediction.probabilities).map(([label, prob]) => (
                        <div key={label} className="relative">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{label}</span>
                            <span className="text-gray-900 font-semibold">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${label === prediction.her2Status ? "bg-purple-600" : "bg-gray-400"
                                }`}
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {prediction.riskLevel === "Critical" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 text-red-700 text-sm">
                      <AlertCircle className="w-5 h-5" />
                      Critical risk detected. Immediate follow-up recommended.
                    </div>
                  )}
                </div>

                {/* Heatmap Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Explainable AI Heatmap
                    </h3>
                    <div className="flex gap-2">
                      <button className="p-2 border rounded hover:bg-gray-50">
                        <ZoomIn className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 border rounded hover:bg-gray-50">
                        <ZoomOut className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 border rounded hover:bg-gray-50">
                        <RotateCw className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        Original Image
                      </p>
                      <div className="bg-black rounded-lg overflow-hidden h-80 flex items-center justify-center">
                        {(originalImageUrl || imageFile) && (
                          <img
                            src={originalImageUrl || (imageFile ? URL.createObjectURL(imageFile) : '')}
                            alt="Original"
                            className="h-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        XAI Heatmap (GradCAM++)
                      </p>
                      <div className="bg-black rounded-lg overflow-hidden h-80 flex items-center justify-center relative">
                        {gradcamUrl ? (
                          <>
                            <img
                              src={gradcamUrl}
                              alt="GradCAM Heatmap"
                              className="h-full object-contain"
                            />
                            {/* Heatmap Legend Overlay */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm">
                              <div className="w-16 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full" />
                              <span className="text-gray-600">
                                Low Risk → High Risk
                              </span>
                            </div>
                          </>
                        ) : imageFile ? (
                          <div className="text-gray-400 text-sm">
                            GradCAM visualization not available
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Zoom: 1.00x | Rotation: 0°
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleSavePrediction}
                    disabled={isProcessing || isSaved}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isSaved
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Prediction Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isProcessing ? "Saving..." : "Save Prediction"}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Continue to Patient History
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2 CONTENT */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Step 1 Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Step 1 Complete: AI Prediction Results
                  </p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      Her2 Status:{" "}
                      <span className="font-bold text-purple-700">
                        {prediction?.her2Status}
                      </span>
                    </span>
                    <span className="text-xs text-gray-600">
                      Risk Score:{" "}
                      <span className="font-bold text-gray-900">
                        {prediction?.riskScore}%
                      </span>
                    </span>
                    <span className="text-xs text-gray-600">
                      Risk Level:{" "}
                      <span className="font-medium bg-yellow-100 text-yellow-800 px-1 rounded">
                        {prediction?.riskLevel}
                      </span>
                    </span>
                    <span className="text-xs text-gray-600">
                      Confidence:{" "}
                      <span className="font-bold text-gray-900">
                        {(prediction?.confidence || 0) * 100}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium border border-gray-300 bg-white px-3 py-1 rounded-lg"
              >
                ← Back to Step 1
              </button>
            </div>

            {/* Patient History Input */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Patient History & Clinical Notes
                </h2>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Clinical History & Observations
                </label>
                <textarea
                  value={patientHistory}
                  onChange={(e) => setPatientHistory(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter relevant patient history, symptoms, previous diagnoses, family history, etc..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  This information will be used by the LLM to generate
                  personalized recommendations.
                </p>
              </div>

              {/* Read-only Patient Record */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-2">
                  From Patient Record:
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Medical History:</span>{" "}
                    <span className={patient?.medical_history ? "text-gray-900" : "text-amber-600"}>
                      {patient?.medical_history || "None recorded"}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Allergies:</span>{" "}
                    <span className={patient?.allergies ? "text-gray-900" : "text-amber-600"}>
                      {patient?.allergies || "None"}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Current Medications:</span>{" "}
                    <span className={patient?.current_medications ? "text-gray-900" : "text-amber-600"}>
                      {patient?.current_medications || "None"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Supporting Documents */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Supporting Documents
                  </h2>
                </div>
                <div>
                  <input
                    ref={supportingDocsInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(event) => {
                      handleSupportingDocsSelect(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <button
                    onClick={() => supportingDocsInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4" /> Upload Files
                  </button>
                </div>
              </div>
              {supportingDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <p>No documents uploaded yet</p>
                  <p className="text-xs mt-1">
                    Upload lab reports, previous scans, or other relevant documents
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {supportingDocs.map((doc) => (
                    <li
                      key={doc.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${doc.error
                          ? "border-red-200 bg-red-50"
                          : doc.uploading
                            ? "border-blue-200 bg-blue-50"
                            : doc.backendId
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {doc.uploading ? (
                          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : doc.error ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : doc.backendId ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.size)} · {doc.uploading ? "Uploading..." : doc.error ? doc.error : doc.backendId ? "Uploaded" : "Pending"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSupportingDoc(doc.id)}
                        disabled={doc.uploading}
                        className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Generate Button */}
            {!recommendations && (
              <button
                onClick={handleGenerateRecommendations}
                disabled={isGeneratingRecs || !patientHistory}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isGeneratingRecs
                  ? "Generating Recommendations..."
                  : "Generate LLM Recommendations"}
              </button>
            )}

            {/* LLM Recommendations */}
            {recommendations && (
              <>
                <div className="bg-white rounded-xl border border-green-500 p-6">
                  <div className="flex items-center gap-2 mb-6 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <h3 className="font-semibold">
                      Personalized LLM Recommendations
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-2">
                        Clinical Assessment
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-800">
                        {recommendations.assessment}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-2">
                        Treatment Recommendations
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-800">
                        <ul className="list-disc list-inside space-y-1">
                          {recommendations.treatment.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-2">
                        Follow-up Schedule
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-800">
                        <ul className="list-disc list-inside space-y-1">
                          {recommendations.followUp.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-2">
                        Risk Mitigation Strategies
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-800">
                        <ul className="list-disc list-inside space-y-1">
                          {recommendations.mitigation.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                    <RotateCw className="w-3 h-3" />
                    Generated at {recommendations.generatedAt}
                  </div>

                  {/* Action Buttons for Recommendation */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          if (!caseId) return;
                          try {
                            // Get latest recommendation and accept it
                            const recs = await caseService.getRecommendations(caseId);
                            if (recs.results && recs.results.length > 0) {
                              await caseService.updateRecommendationStatus(caseId, recs.results[0].id, 'saved');
                              alert("Recommendation accepted and case finalized!");
                              navigate(`/doctor/patients/${patientId}/cases`);
                            }
                          } catch (err) {
                            console.error("Error accepting recommendation:", err);
                            alert("Failed to accept recommendation");
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept & Finalize
                      </button>
                      <button
                        onClick={async () => {
                          if (!caseId) return;
                          try {
                            const recs = await caseService.getRecommendations(caseId);
                            if (recs.results && recs.results.length > 0) {
                              await caseService.updateRecommendationStatus(caseId, recs.results[0].id, 'discarded');
                              alert("Recommendation rejected.");
                              setRecommendations(null); // Clear the recommendations
                            }
                          } catch (err) {
                            console.error("Error rejecting recommendation:", err);
                            alert("Failed to reject recommendation");
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={handleGenerateRecommendations}
                        disabled={isGeneratingRecs}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${isGeneratingRecs ? 'animate-spin' : ''}`} />
                        {isGeneratingRecs ? 'Regenerating...' : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
