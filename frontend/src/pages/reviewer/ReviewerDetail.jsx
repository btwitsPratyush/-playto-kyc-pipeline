import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';

export default function ReviewerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const res = await api.get(`/kyc/${id}`);
      setSubmission(res.data);
    } catch (e) {
      console.error(e);
      alert('Failed to load submission');
      navigate('/reviewer');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setErrorMsg('');
    if ((action === 'reject' || action === 'request-more-info') && !reason.trim()) {
      setErrorMsg('Reason is required for this action');
      return;
    }
    
    setSubmittingAction(action);
    try {
      await api.post(`/kyc/${id}/${action}`, { reason });
      navigate('/reviewer', { state: { message: `Submission ${action === 'request-more-info' ? 'info requested' : action + 'd'} successfully` } });
    } catch (e) {
      setErrorMsg(e.response?.data?.error || 'Failed to process action');
    } finally {
      setSubmittingAction(null);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!submission) return <div>Not Found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/reviewer" className="text-blue-600 font-medium text-sm hover:underline">&larr; Back to Queue</Link>
      
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Application #{submission.id}</h2>
          <p className="text-slate-500 mt-1">Submitted: {new Date(submission.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
            {submission.status.replace('_', ' ')}
          </span>
          {submission.at_risk && (
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 uppercase tracking-wide shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> 🔴 AT RISK
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Personal Details</h3>
          <div className="space-y-3">
            <div>
              <span className="block text-sm text-slate-500">Name</span>
              <span className="font-medium text-slate-800">{submission.personal_details?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-sm text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{submission.personal_details?.phone || 'N/A'}</span>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Business Details</h3>
          <div className="space-y-3">
            <div>
              <span className="block text-sm text-slate-500">Company Name</span>
              <span className="font-medium text-slate-800">{submission.business_details?.company_name || 'N/A'}</span>
            </div>
          </div>
        </section>

        <section className="col-span-2 bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Documents</h3>
          {submission.documents?.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4">
              {submission.documents.map(doc => (
                <li key={doc.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="font-medium text-slate-700">{doc.type}</span>
                  <div className="flex gap-4">
                    <a href={`http://localhost:8000${doc.file}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      [View]
                    </a>
                    <a href={`http://localhost:8000${doc.file}`} download className="text-sm font-medium text-slate-600 hover:text-slate-800">
                      [Download]
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No documents uploaded.</p>
          )}
        </section>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Reviewer Actions</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason (required for Reject / Info Request)</label>
          <textarea 
            className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" 
            rows="3" 
            value={reason} 
            onChange={e => setReason(e.target.value)}
          ></textarea>
        </div>
        {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}
        <div className="flex gap-4 pt-2">
          <button 
            onClick={() => handleAction('approve')} 
            disabled={submission.status === 'approved' || submittingAction}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingAction === 'approve' ? 'Processing...' : 'Approve'}
          </button>
          <button 
            onClick={() => handleAction('request-more-info')} 
            disabled={submittingAction}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingAction === 'request-more-info' ? 'Processing...' : 'Request Info'}
          </button>
          <button 
            onClick={() => handleAction('reject')} 
            disabled={submission.status === 'rejected' || submittingAction}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingAction === 'reject' ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
