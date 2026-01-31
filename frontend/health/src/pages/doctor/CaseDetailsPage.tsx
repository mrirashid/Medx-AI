import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    ClipboardList,
    Eye,
    FileText,
    Printer,
    RefreshCw,
    Shield,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import caseService from "../../services/caseService";
import patientService from "../../services/patientService";

interface CaseData {
    id: string;
    case_code: string;
    patient: string;
    patient_name?: string;
    patient_code?: string;
    status: string;
    risk_level: string | null;
    has_prediction?: boolean;
    has_recommendation?: boolean;
    created_at: string;
    notes?: string | null;
}

interface PredictionData {
    id: string;
    her2_status: string;
    confidence: number;
    risk_level: string;
    risk_score: number;
    probabilities: Record<string, number>;
    gradcam_url: string | null;
    original_image_url: string | null;
    model_version: string;
    created_at: string;
}

interface RecommendationData {
    id: string;
    clinical_assessment: string;
    treatment_recommendations: string | string[];
    followup_schedule: string | string[];
    risk_mitigation: string | string[];
    status: string;
    created_at: string;
}

interface PatientData {
    id: string;
    full_name?: string | null;
    name?: string | null;
    patient_code?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    dob?: string | null;
    phone_number?: string | null;
    email?: string | null;
    address?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relation?: string | null;
    emergency_contact_phone?: string | null;
    medical_history?: string | null;
    allergies?: string | null;
    current_medications?: string | null;
    assigned_doctor_name?: string | null;
}

export default function CaseDetailsPage() {
    const { caseId = "" } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientData | null>(null);
    const [caseData, setCaseData] = useState<CaseData | null>(null);
    const [predictions, setPredictions] = useState<PredictionData[]>([]);
    const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // New states for modals and actions
    const [selectedPrediction, setSelectedPrediction] = useState<PredictionData | null>(null);
    const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationData | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isSavingRecommendation, setIsSavingRecommendation] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const caseRes = await caseService.getCase(caseId);
            setCaseData(caseRes);

            const [patientRes, predsRes, recsRes] = await Promise.all([
                patientService.getPatient(caseRes.patient),
                caseService.getPredictions(caseId),
                caseService.getRecommendations(caseId),
            ]);

            setPatient(patientRes);
            setPredictions(predsRes.results || []);
            setRecommendations(recsRes.results || []);
        } catch (err) {
            console.error("Error fetching case details:", err);
            setError("Failed to load case details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [caseId]);

    const handleDeleteCase = async () => {
        if (!caseData) return;

        setDeleting(true);
        try {
            await caseService.deleteCase(caseData.id);
            navigate("/doctor/cases", { replace: true });
        } catch (err) {
            console.error("Error deleting case:", err);
            setError("Failed to delete case");
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleRegenerateRecommendation = async () => {
        if (!caseData || predictions.length === 0) return;

        setIsRegenerating(true);
        try {
            const latestPrediction = predictions[0];
            await caseService.generateRecommendation(caseId, latestPrediction.id);
            setSuccessMessage("New recommendation generated successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchData(); // Refresh data
        } catch (err) {
            console.error("Error regenerating recommendation:", err);
            setError("Failed to regenerate recommendation");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSaveRecommendation = async (status: 'saved' | 'discarded') => {
        if (!caseData || recommendations.length === 0) return;

        setIsSavingRecommendation(true);
        try {
            const latestRec = recommendations[0];
            await caseService.updateRecommendationStatus(caseId, latestRec.id, status);
            setSuccessMessage(status === 'saved' ? "Recommendation accepted and saved!" : "Recommendation discarded.");
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchData(); // Refresh data
        } catch (err) {
            console.error("Error updating recommendation:", err);
            setError("Failed to update recommendation status");
        } finally {
            setIsSavingRecommendation(false);
        }
    };

    const parseArray = (data: string | string[] | undefined): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
            return JSON.parse(data);
        } catch {
            return [data];
        }
    };

    const getRiskColor = (riskLevel: string | null) => {
        switch (riskLevel?.toLowerCase()) {
            case "critical":
                return "bg-red-100 text-red-800 border-red-200";
            case "high":
                return "bg-orange-100 text-orange-800 border-orange-200";
            case "medium":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "low":
                return "bg-green-100 text-green-800 border-green-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "complete":
                return "bg-green-100 text-green-800";
            case "in_progress":
                return "bg-blue-100 text-blue-800";
            case "draft":
                return "bg-gray-100 text-gray-800";
            case "cancelled":
                return "bg-red-100 text-red-800";
            case "saved":
                return "bg-green-100 text-green-800";
            case "discarded":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "complete":
                return "Complete";
            case "in_progress":
                return "In Progress";
            case "draft":
                return "Draft";
            case "cancelled":
                return "Cancelled";
            case "saved":
                return "Accepted";
            case "discarded":
                return "Rejected";
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error || !caseData) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-800">Error</h3>
                        <p className="text-red-600">{error || "Case not found"}</p>
                    </div>
                    <button
                        onClick={() => navigate("/doctor/cases")}
                        className="ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                    >
                        Back to Cases
                    </button>
                </div>
            </div>
        );
    }

    const patientName = patient?.full_name || patient?.name || caseData.patient_name || "Unknown";
    const patientDob = patient?.dob || patient?.date_of_birth;
    const age = patientDob
        ? Math.floor(
            (new Date().getTime() - new Date(patientDob).getTime()) /
            (1000 * 3600 * 24 * 365.25)
        )
        : null;

    const latestPrediction = predictions[0];
    const latestRecommendation = recommendations[0];
    const isRecommendationDraft = latestRecommendation?.status === 'draft';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Success Message */}
            {successMessage && (
                <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
                    {successMessage}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-200 mb-6">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/doctor/cases")}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                {patientName.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-gray-900">{patientName}</h1>
                                <p className="text-xs text-gray-500">
                                    {patient?.gender} | Age: {age || "--"} | Case: {caseData.case_code}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    // Generate comprehensive report with all data
                                    caseService.generateCaseReport({
                                        case_code: caseData.case_code,
                                        patient_name: patientName,
                                        patient_code: patient?.patient_code || caseData.patient_code,
                                        status: caseData.status,
                                        risk_level: caseData.risk_level,
                                        created_at: caseData.created_at,
                                        notes: caseData.notes,
                                        // Enhanced patient info
                                        patient_gender: patient?.gender,
                                        patient_age: age,
                                        patient_dob: patientDob,
                                        patient_phone: patient?.phone_number,
                                        patient_email: patient?.email,
                                        patient_address: patient?.address,
                                        emergency_contact_name: patient?.emergency_contact_name,
                                        emergency_contact_relation: patient?.emergency_contact_relation,
                                        emergency_contact_phone: patient?.emergency_contact_phone,
                                        medical_history: patient?.medical_history,
                                        allergies: patient?.allergies,
                                        current_medications: patient?.current_medications,
                                        assigned_doctor_name: patient?.assigned_doctor_name,
                                        predictions: predictions.map(p => ({
                                            id: p.id,
                                            case: caseId,
                                            her2_status: p.her2_status,
                                            confidence: p.confidence,
                                            risk_level: p.risk_level,
                                            risk_score: p.risk_score,
                                            probabilities: p.probabilities,
                                            gradcam_url: p.gradcam_url,
                                            original_image_url: p.original_image_url,
                                            model_version: p.model_version,
                                            requested_by: '',
                                            created_at: p.created_at
                                        })),
                                        recommendations: recommendations.map(r => ({
                                            id: r.id,
                                            case: caseId,
                                            prediction: '',
                                            status: r.status as 'draft' | 'saved' | 'discarded',
                                            clinical_notes: '',
                                            recommendation_text: '',
                                            clinical_assessment: r.clinical_assessment,
                                            treatment_recommendations: Array.isArray(r.treatment_recommendations)
                                                ? r.treatment_recommendations.join('\n')
                                                : r.treatment_recommendations,
                                            followup_schedule: Array.isArray(r.followup_schedule)
                                                ? r.followup_schedule.join('\n')
                                                : r.followup_schedule,
                                            risk_mitigation: Array.isArray(r.risk_mitigation)
                                                ? r.risk_mitigation.join('\n')
                                                : r.risk_mitigation,
                                            model_version: '',
                                            generated_by: '',
                                            created_at: r.created_at
                                        }))
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-white border border-green-300 rounded-lg hover:bg-green-50"
                            >
                                <Printer className="w-4 h-4" /> Report
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Status Banner for incomplete cases */}
                {caseData.status !== 'complete' && caseData.status !== 'cancelled' && (
                    <div className={`rounded-xl border p-4 flex items-center justify-between ${!caseData.has_prediction
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-yellow-50 border-yellow-200'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!caseData.has_prediction ? 'bg-blue-100' : 'bg-yellow-100'
                                }`}>
                                {!caseData.has_prediction ? (
                                    <Activity className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <ClipboardList className="w-5 h-5 text-yellow-600" />
                                )}
                            </div>
                            <div>
                                <h3 className={`text-sm font-semibold ${!caseData.has_prediction ? 'text-blue-900' : 'text-yellow-900'
                                    }`}>
                                    {!caseData.has_prediction
                                        ? 'Step 1: Run AI Prediction'
                                        : 'Step 2: Generate Recommendation'}
                                </h3>
                                <p className={`text-xs ${!caseData.has_prediction ? 'text-blue-700' : 'text-yellow-700'
                                    }`}>
                                    {!caseData.has_prediction
                                        ? 'Upload a medical image to get HER2 prediction results'
                                        : 'Generate clinical recommendations based on the prediction'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/doctor/patients/${caseData.patient}/cases/${caseId}/analyze`)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg ${!caseData.has_prediction
                                ? 'text-white bg-blue-600 hover:bg-blue-700'
                                : 'text-white bg-yellow-600 hover:bg-yellow-700'
                                }`}
                        >
                            {!caseData.has_prediction ? 'Start Analysis →' : 'Continue →'}
                        </button>
                    </div>
                )}

                {/* Case Overview */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        Case Overview
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Case ID</p>
                            <p className="text-sm font-mono font-medium text-gray-900">{caseData.case_code || caseData.id}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseData.status)}`}>
                                {getStatusLabel(caseData.status)}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(caseData.risk_level)}`}>
                                {caseData.risk_level || "Not assessed"}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Created</p>
                            <p className="text-sm font-medium text-gray-900">
                                {new Date(caseData.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    {caseData.notes && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Clinical Notes</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Latest Prediction Results */}
                {latestPrediction ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Latest AI Prediction
                            <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                {new Date(latestPrediction.created_at).toLocaleDateString()}
                            </span>
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <p className="text-xs text-blue-600 mb-1">HER2 Status</p>
                                        <p className="text-lg font-bold text-blue-900">{latestPrediction.her2_status}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <p className="text-xs text-green-600 mb-1">Confidence</p>
                                        <p className="text-lg font-bold text-green-900">
                                            {(latestPrediction.confidence * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                <div className={`rounded-lg p-4 border ${getRiskColor(latestPrediction.risk_level)}`}>
                                    <p className="text-xs mb-1">Risk Assessment</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-bold capitalize">{latestPrediction.risk_level}</p>
                                        <p className="text-sm">Score: {latestPrediction.risk_score}/100</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs text-gray-600 mb-3">Classification Probabilities</p>
                                    <div className="space-y-2">
                                        {Object.entries(latestPrediction.probabilities || {}).map(([label, prob]) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600 w-16">{label}</span>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full"
                                                        style={{ width: `${(prob as number) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-900 w-12 text-right">
                                                    {((prob as number) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400">
                                    Model: {latestPrediction.model_version}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {latestPrediction.original_image_url && (
                                    <div>
                                        <p className="text-xs text-gray-600 mb-2">Original Image</p>
                                        <img
                                            src={latestPrediction.original_image_url}
                                            alt="Original tissue"
                                            className="w-full rounded-lg border border-gray-200"
                                        />
                                    </div>
                                )}
                                {latestPrediction.gradcam_url && (
                                    <div>
                                        <p className="text-xs text-gray-600 mb-2">Grad-CAM Visualization</p>
                                        <img
                                            src={latestPrediction.gradcam_url}
                                            alt="Grad-CAM heatmap"
                                            className="w-full rounded-lg border border-gray-200"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-gray-400" />
                            AI Prediction Results
                        </h2>
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No prediction has been run for this case yet.</p>
                            <button
                                onClick={() => navigate(`/doctor/patients/${caseData.patient}/cases/${caseId}/analyze`)}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Run Prediction →
                            </button>
                        </div>
                    </div>
                )}

                {/* Recommendations with Accept/Reject/Regenerate */}
                {latestRecommendation ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-green-600" />
                                Clinical Recommendations
                            </h2>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(latestRecommendation.status)}`}>
                                {getStatusLabel(latestRecommendation.status)}
                            </span>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Clinical Assessment
                            </h3>
                            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                                {latestRecommendation.clinical_assessment}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Treatment Plan
                                </h3>
                                <ul className="space-y-2">
                                    {parseArray(latestRecommendation.treatment_recommendations).map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600" /> Follow-up Schedule
                                </h3>
                                <ul className="space-y-2">
                                    {parseArray(latestRecommendation.followup_schedule).map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-orange-600" /> Risk Mitigation
                                </h3>
                                <ul className="space-y-2">
                                    {parseArray(latestRecommendation.risk_mitigation).map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="text-orange-500 mt-0.5">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-4">
                            Generated: {new Date(latestRecommendation.created_at).toLocaleString()}
                        </p>

                        {/* Action buttons for draft recommendations */}
                        {isRecommendationDraft && (
                            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center gap-3">
                                <button
                                    onClick={() => handleSaveRecommendation('saved')}
                                    disabled={isSavingRecommendation}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> Accept & Finalize
                                </button>
                                <button
                                    onClick={() => handleSaveRecommendation('discarded')}
                                    disabled={isSavingRecommendation}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={handleRegenerateRecommendation}
                                    disabled={isRegenerating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                </button>
                            </div>
                        )}

                        {/* Show regenerate option even for saved recommendations */}
                        {!isRecommendationDraft && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={handleRegenerateRecommendation}
                                    disabled={isRegenerating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    {isRegenerating ? 'Regenerating...' : 'Generate New Recommendation'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-gray-400" />
                            Clinical Recommendations
                        </h2>
                        <div className="text-center py-8 text-gray-500">
                            <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No recommendations have been generated for this case yet.</p>
                            {latestPrediction && (
                                <button
                                    onClick={handleRegenerateRecommendation}
                                    disabled={isRegenerating}
                                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                                >
                                    {isRegenerating ? 'Generating...' : 'Generate Recommendations →'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Prediction History - Clickable to view details */}
                {predictions.length >= 1 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prediction History ({predictions.length} total)</h2>
                        <div className="space-y-3">
                            {predictions.map((pred, idx) => (
                                <div
                                    key={pred.id}
                                    onClick={() => setSelectedPrediction(pred)}
                                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${idx === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(pred.risk_level)}`}>
                                                {pred.risk_level}
                                            </span>
                                            <span className="text-sm text-gray-600">HER2: {pred.her2_status}</span>
                                            <span className="text-sm text-gray-600">Confidence: {(pred.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                {idx === 0 ? '(Latest) ' : ''}{new Date(pred.created_at).toLocaleString()}
                                            </span>
                                            <Eye className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendation History - Clickable */}
                {recommendations.length >= 1 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendation History ({recommendations.length} total)</h2>
                        <div className="space-y-3">
                            {recommendations.map((rec, idx) => (
                                <div
                                    key={rec.id}
                                    onClick={() => setSelectedRecommendation(rec)}
                                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${idx === 0 ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(rec.status)}`}>
                                                {getStatusLabel(rec.status)}
                                            </span>
                                            <p className="text-sm text-gray-700 line-clamp-1">{rec.clinical_assessment?.slice(0, 100)}...</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {idx === 0 ? '(Latest) ' : ''}{new Date(rec.created_at).toLocaleString()}
                                            </span>
                                            <Eye className="w-4 h-4 text-green-500" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-md w-full max-w-md">
                        <div className="p-4 border-b">
                            <div className="font-semibold text-red-600">Delete Case</div>
                        </div>
                        <div className="p-4 text-sm text-gray-600">
                            Are you sure you want to delete case{" "}
                            <span className="font-mono font-medium text-gray-900">
                                {caseData.case_code}
                            </span>
                            ? This will remove all associated predictions and recommendations. This action cannot be undone.
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCase}
                                disabled={deleting}
                                className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete Case"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prediction Detail Modal */}
            {selectedPrediction && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-md w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="font-semibold text-gray-900">Prediction Details</div>
                            <button
                                onClick={() => setSelectedPrediction(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <p className="text-xs text-blue-600 mb-1">HER2 Status</p>
                                            <p className="text-lg font-bold text-blue-900">{selectedPrediction.her2_status}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-xs text-green-600 mb-1">Confidence</p>
                                            <p className="text-lg font-bold text-green-900">
                                                {(selectedPrediction.confidence * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`rounded-lg p-4 border ${getRiskColor(selectedPrediction.risk_level)}`}>
                                        <p className="text-xs mb-1">Risk Assessment</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-bold capitalize">{selectedPrediction.risk_level}</p>
                                            <p className="text-sm">Score: {selectedPrediction.risk_score}/100</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-xs text-gray-600 mb-3">Classification Probabilities</p>
                                        <div className="space-y-2">
                                            {Object.entries(selectedPrediction.probabilities || {}).map(([label, prob]) => (
                                                <div key={label} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-600 w-16">{label}</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full"
                                                            style={{ width: `${(prob as number) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-900 w-12 text-right">
                                                        {((prob as number) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400">
                                        Model: {selectedPrediction.model_version} | Created: {new Date(selectedPrediction.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {selectedPrediction.original_image_url && (
                                        <div>
                                            <p className="text-xs text-gray-600 mb-2">Original Image</p>
                                            <img
                                                src={selectedPrediction.original_image_url}
                                                alt="Original tissue"
                                                className="w-full rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    )}
                                    {selectedPrediction.gradcam_url && (
                                        <div>
                                            <p className="text-xs text-gray-600 mb-2">Grad-CAM Visualization</p>
                                            <img
                                                src={selectedPrediction.gradcam_url}
                                                alt="Grad-CAM heatmap"
                                                className="w-full rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button
                                onClick={() => setSelectedPrediction(null)}
                                className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendation Detail Modal */}
            {selectedRecommendation && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-md w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="font-semibold text-gray-900">Recommendation Details</div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRecommendation.status)}`}>
                                    {getStatusLabel(selectedRecommendation.status)}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedRecommendation(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Clinical Assessment */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Clinical Assessment
                                </h3>
                                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                                    {selectedRecommendation.clinical_assessment}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Treatment Plan
                                    </h3>
                                    <ul className="space-y-2">
                                        {parseArray(selectedRecommendation.treatment_recommendations).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-green-500 mt-0.5">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-600" /> Follow-up Schedule
                                    </h3>
                                    <ul className="space-y-2">
                                        {parseArray(selectedRecommendation.followup_schedule).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-blue-500 mt-0.5">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-600" /> Risk Mitigation
                                    </h3>
                                    <ul className="space-y-2">
                                        {parseArray(selectedRecommendation.risk_mitigation).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-orange-500 mt-0.5">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400">
                                Generated: {new Date(selectedRecommendation.created_at).toLocaleString()}
                            </p>
                        </div>

                        {/* Action buttons in modal footer */}
                        <div className="p-4 border-t flex items-center justify-between sticky bottom-0 bg-white">
                            <div className="flex items-center gap-3">
                                {selectedRecommendation.status === 'draft' && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                await handleSaveRecommendation('saved');
                                                setSelectedRecommendation(null);
                                            }}
                                            disabled={isSavingRecommendation}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" /> Accept & Finalize
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await handleSaveRecommendation('discarded');
                                                setSelectedRecommendation(null);
                                            }}
                                            disabled={isSavingRecommendation}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" /> Reject
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={async () => {
                                        await handleRegenerateRecommendation();
                                        setSelectedRecommendation(null);
                                    }}
                                    disabled={isRegenerating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedRecommendation(null)}
                                className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
