import { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function MerchantForm() {
  const [status, setStatus] = useState('draft');
  const [personalDetails, setPersonalDetails] = useState({ name: '', phone: '' });
  const [businessDetails, setBusinessDetails] = useState({ company_name: '' });
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('PAN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/kyc/me');
      if (res.data) {
        setStatus(res.data.status);
        setPersonalDetails(res.data.personal_details || { name: '', phone: '' });
        setBusinessDetails(res.data.business_details || { company_name: '' });
        setDocuments(res.data.documents || []);
      }
    } catch (e) {
      if (e.response?.status !== 404) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (formType) => {
    try {
      const formData = new FormData();
      if (formType === 'personal' || formType === 'all') formData.append('personal_details', JSON.stringify(personalDetails));
      if (formType === 'business' || formType === 'all') formData.append('business_details', JSON.stringify(businessDetails));
      if (file) {
        formData.append('documents', file);
        formData.append('doc_type', docType);
      }
      
      const res = await api.post('/kyc/save-draft', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocuments(res.data.documents);
      setFile(null);
      alert('Draft saved successfully!');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save draft');
    }
  };

  const submitKYC = async () => {
    try {
      const res = await api.post('/kyc/submit');
      setStatus(res.data.status);
      alert('KYC Submitted Successfully!');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to submit KYC');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h2 className="text-2xl font-bold text-slate-800">KYC Onboarding</h2>
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
          Status: {status.replace('_', ' ')}
        </span>
      </div>

      {status !== 'draft' && status !== 'more_info_requested' ? (
        <div className="text-center py-20 px-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3 uppercase tracking-tight">Application {status.replace('_', ' ')}</h3>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your documents are currently being verified by our compliance team. You'll be notified once the process is complete.
          </p>
          <div className="mt-10 pt-10 border-t border-slate-100 flex flex-col items-center gap-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Est. Verification Time: 24-48 Hours</p>
            <button 
              onClick={fetchData} 
              className="text-sm font-medium px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Personal Details */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Personal Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input placeholder="Full Name" className="border rounded-lg p-2.5 outline-none" value={personalDetails.name} onChange={e => setPersonalDetails({...personalDetails, name: e.target.value})} />
              <input placeholder="Phone Number" className="border rounded-lg p-2.5 outline-none" value={personalDetails.phone} onChange={e => setPersonalDetails({...personalDetails, phone: e.target.value})} />
            </div>
            <button onClick={() => saveDraft('personal')} className="text-sm border border-slate-300 font-medium px-4 py-2 rounded-lg hover:bg-slate-100">Save Personal Details</button>
          </section>

          {/* Section 2: Business Details */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Business Details</h3>
            <div className="mb-4">
              <input placeholder="Company Name" className="w-full border rounded-lg p-2.5 outline-none" value={businessDetails.company_name} onChange={e => setBusinessDetails({...businessDetails, company_name: e.target.value})} />
            </div>
            <button onClick={() => saveDraft('business')} className="text-sm border border-slate-300 font-medium px-4 py-2 rounded-lg hover:bg-slate-100">Save Business Details</button>
          </section>

          {/* Section 3: Documents */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Upload Documents</h3>
            <div className="flex items-center gap-4 mb-4">
              <select className="border rounded-lg p-2.5 outline-none" value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="PAN">PAN Card</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="bank_statement">Bank Statement</option>
              </select>
              <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <button onClick={() => saveDraft('doc')} className="text-sm bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-200">Upload</button>
            </div>
            
            {documents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Uploaded Files:</h4>
                <ul className="space-y-2">
                  {documents.map(doc => (
                    <li key={doc.id} className="flex justify-between items-center text-sm p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-medium text-slate-700">{doc.type}</span>
                      <a href={`http://localhost:8000${doc.file}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View File</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="pt-6 border-t flex justify-end">
             <button onClick={submitKYC} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors text-lg">
               Submit Application
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
