import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';

export default function ReviewerDashboard() {
  const [queue, setQueue] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const successMsg = location.state?.message;

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/kyc/queue');
      setQueue(res.data.queue);
      setMetrics(res.data.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg shadow-sm font-medium">
          ✅ {successMsg}
        </div>
      )}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total in Queue</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{metrics?.total_in_queue}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Avg Time in Queue</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{(metrics?.avg_time_in_queue / 3600).toFixed(1)} hrs</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">7D Approval Rate</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{metrics?.approval_rate_last_7_days.toFixed(0)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Pending Submissions</h2>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 py-1 px-3 rounded-full">Sorted by oldest submissions first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Merchant</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Submitted At</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => (
                <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${item.at_risk ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{item.user.username}</div>
                    <div className="text-sm text-slate-500">{item.personal_details?.name}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
                        {item.status.replace('_', ' ')}
                      </span>
                      {item.at_risk && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide flex items-center gap-1 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> 🔴 AT RISK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <Link to={`/reviewer/submission/${item.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500 text-sm">No items in the queue</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
