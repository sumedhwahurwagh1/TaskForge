import { Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { prioritizeAssignments } from '../../utils/deadlineEngine';
import AssignmentCard from './AssignmentCard';
import EmptyState from '../common/EmptyState';

export default function FocusToday({ onEditAssignment }) {
  const { assignmentsWithProgress } = useApp();
  // Filter and prioritize active assignments with student's decoupled progress
  const topAssignments = prioritizeAssignments(assignmentsWithProgress).slice(0, 4);

  return (
    <section className="focus-today">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          <h2 className="section-title">Focus Today</h2>
        </div>
        <p className="section-subtitle">
          Your highest-priority assignments ranked by urgency, deadlines, and weight.
        </p>
      </div>

      {topAssignments.length > 0 ? (
        <div className="focus-today-grid">
          {topAssignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onView={onEditAssignment}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="All caught up!"
          description="You have completed all pending assignments. Great job staying ahead! 🎉"
        />
      )}
    </section>
  );
}
