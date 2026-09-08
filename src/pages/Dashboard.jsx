import { useState, useMemo } from 'react';
import { Clock, Calendar, AlertTriangle, CheckCircle, Plus, BookOpen, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDashboardStats, getDeadlineState, DEADLINE_STATE } from '../utils/deadlineEngine';
import StatCard from '../components/dashboard/StatCard';
import FocusToday from '../components/dashboard/FocusToday';
import AssignmentRow from '../components/assignments/AssignmentRow';
import AssignmentModal from '../components/assignments/AssignmentModal';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import { getSubjectById, SUBJECTS } from '../data/subjects';
import { can, ACTIONS as RBAC_ACTIONS } from '../permissions/rbac';

export default function Dashboard() {
  const { state, currentUser, assignmentsWithProgress, isTeacher } = useApp();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Use enriched assignments with student's personal progress
  const assignments = assignmentsWithProgress;

  // Student stats based on personal progress
  const studentStats = useMemo(() => getDashboardStats(assignments), [assignments]);

  // Teacher stats based on assignments managed
  const teacherStats = useMemo(() => {
    const authorizedSubjects = currentUser.authorizedSubjectIds || [];
    const myAssignments = state.assignments.filter(a => authorizedSubjects.includes(a.subject));
    const now = new Date();

    const active = myAssignments.filter(a => new Date(a.dueDate) >= now);
    const overdue = myAssignments.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.OVERDUE);

    return {
      totalManaged: myAssignments.length,
      activeCount: active.length,
      overdueCount: overdue.length,
      subjectsCount: authorizedSubjects.length,
    };
  }, [state.assignments, currentUser]);

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => {
        const subject = getSubjectById(a.subject);
        return (
          a.title.toLowerCase().includes(q) ||
          (subject && subject.name.toLowerCase().includes(q)) ||
          (subject && subject.code.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q))
        );
      });
    }

    // Default sort by due date
    result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return result;
  }, [assignments, search]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedAssignment(null);
    setModalOpen(true);
  };

  const handleEdit = (assignment) => {
    setModalMode('edit');
    setSelectedAssignment(assignment);
    setModalOpen(true);
  };

  const handleView = (assignment) => {
    setModalMode('view');
    setSelectedAssignment(assignment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAssignment(null);
  };

  return (
    <>
      {/* Header Greeting */}
      <div className="greeting">
        <h1>
          {greeting}, {currentUser.name} {isTeacher ? '👨‍🏫' : '👋'}
        </h1>
        <p>
          {isTeacher
            ? `Academic Assignment Management • ${currentUser.department || 'Faculty'}`
            : "Here's what needs your attention today."}
        </p>
      </div>

      {/* Metrics Grid */}
      {isTeacher ? (
        <div className="stats-grid">
          <StatCard
            icon={Layers}
            number={teacherStats.totalManaged}
            label="Total Managed"
            sub="Across your subjects"
            color="var(--primary)"
            bgColor="rgba(99, 102, 241, 0.15)"
          />
          <StatCard
            icon={Calendar}
            number={teacherStats.activeCount}
            label="Active Deadlines"
            sub="Upcoming assignments"
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <StatCard
            icon={AlertTriangle}
            number={teacherStats.overdueCount}
            label="Overdue Assignments"
            sub="Passed deadline"
            color="var(--danger)"
            bgColor="var(--danger-light)"
          />
          <StatCard
            icon={BookOpen}
            number={teacherStats.subjectsCount}
            label="Subjects Managed"
            sub={
              (currentUser.authorizedSubjectIds || [])
                .map(id => SUBJECTS.find(s => s.id === id)?.code || id)
                .join(', ') || 'None assigned'
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
        </div>
      ) : (
        <div className="stats-grid">
          <StatCard
            icon={Clock}
            number={studentStats.pending.count}
            label="Pending"
            sub={studentStats.pending.sub}
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <StatCard
            icon={Calendar}
            number={studentStats.dueToday.count}
            label="Due Today"
            sub={studentStats.dueToday.sub}
            color="var(--danger)"
            bgColor="var(--danger-light)"
          />
          <StatCard
            icon={AlertTriangle}
            number={studentStats.dueSoon.count}
            label="Due Soon"
            sub={studentStats.dueSoon.sub}
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <StatCard
            icon={CheckCircle}
            number={studentStats.completed.count}
            label="Completed"
            sub={studentStats.completed.sub}
            color="var(--success)"
            bgColor="var(--success-light)"
          />
        </div>
      )}

      {/* Focus Today: High priority for students */}
      {!isTeacher && <FocusToday onEditAssignment={handleView} />}

      {/* Assignment Management or Workload List */}
      <section style={{ marginTop: '24px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="section-title">
                {isTeacher ? 'Managed Course Assignments' : 'All Assignments'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isTeacher
                  ? 'Manage and publish assignments for your assigned academic subjects.'
                  : 'Track your personal deadlines and completion status.'}
              </p>
            </div>

            {/* Teacher Only: Add Assignment Button */}
            {can(currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE) && (
              <button className="btn btn-primary" onClick={handleCreate} id="btn-add-assignment">
                <Plus size={18} />
                Add Assignment
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={isTeacher ? 'Search course assignments...' : 'Search assignments...'}
          />
        </div>

        {filteredAssignments.length > 0 ? (
          <div className="assignments-list">
            {filteredAssignments.map(a => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onEdit={handleEdit}
                onView={handleView}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle}
            title="No assignments found"
            description={
              search
                ? 'Try a different search term.'
                : isTeacher
                ? 'Publish your first course assignment to start managing deadlines.'
                : 'You have no assignments scheduled.'
            }
            action={
              !search && can(currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE) ? (
                <button className="btn btn-primary" onClick={handleCreate}>
                  <Plus size={18} />
                  Add Assignment
                </button>
              ) : null
            }
          />
        )}
      </section>

      {/* Unified Assignment Modal (Create, Edit, View) */}
      <AssignmentModal
        isOpen={modalOpen}
        mode={modalMode}
        onClose={handleCloseModal}
        assignment={selectedAssignment}
      />
    </>
  );
}
