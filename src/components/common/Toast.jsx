import { useApp } from '../../context/AppContext';
import { CheckCircle, Info, AlertCircle } from 'lucide-react';

export default function Toast() {
  const { state } = useApp();

  if (!state.toast) return null;

  const icons = {
    success: <CheckCircle size={18} />,
    info: <Info size={18} />,
    error: <AlertCircle size={18} />,
  };

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast ${state.toast.type || 'info'}`}>
        {icons[state.toast.type] || icons.info}
        {state.toast.message}
      </div>
    </div>
  );
}
