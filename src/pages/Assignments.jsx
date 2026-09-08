import { useState, useMemo } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSubjectById } from '../data/subjects';
import SearchBar from '../components/common/SearchBar';
import AssignmentRow from '../components/assignments/AssignmentRow';
import AssignmentFilters from '../components/assignments/AssignmentFilters';
import AssignmentModal from '../components/assignments/AssignmentModal';
import EmptyState from '../components/common/EmptyState';
import { can, ACTIONS as RBAC_ACTIONS } from '../permissions/rbac';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = { 'in-progress': 0, 'pending': 1, 'completed': 2 };

export default function Assignments() {
  const { currentUser, assignmentsWithProgress, isTeacher } = useApp();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState('all'); // 'all' | 'my'
  const [filters, setFilters] = useState({
    subject: '',
    status: '',
    priority: '',
    sort: 'deadline-asc',
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredAssignments = useMemo(() => {
    let result = [...assignmentsWithProgress];

    // Teacher subject filter
    if (isTeacher && teacherSubjectFilter === 'my') {
      const authorized = currentUser.authorizedSubjectIds || [];
      result = result.filter(a => authorized.includes(a.subject));
    }

    // Search
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

    // Filters
    if (filters.subject) result = result.filter(a => a.subject === filters.subject);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    if (filters.priority) result = result.filter(a => a.priority === filters.priority);

    // Sort
    switch (filters.sort) {
      case 'deadline-asc':
        result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'deadline-desc':
        result.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        break;
      case 'priority':
        result.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
        break;
      case 'status':
        result.sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));
        break;
    }

    return result;
  }, [assignmentsWithProgress, isTeacher, teacherSubjectFilter, currentUser, search, filters]);

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

  const canCreate = can(currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="page-title">{isTeacher ? 'Manage Assignments' : 'Assignments'}</h1>
              {isTeacher && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}
                >
                  Faculty Management
                </span>
              )}
            </div>
            <p className="page-subtitle">
              {filteredAssignments.length} {filteredAssignments.length === 1 ? 'assignment' : 'assignments'} found
            </p>
          </div>

          {/* Teacher Only: Add Assignment Button */}
          {canCreate && (
            <button className="btn btn-primary" onClick={handleCreate} id="btn-add-assignment">
              <Plus size={18} />
              Add Assignment
            </button>
          )}
        </div>
      </div>

      {/* Teacher Filter Toggle: All vs My Subjects */}
      {isTeacher && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn ${teacherSubjectFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            onClick={() => setTeacherSubjectFilter('all')}
          >
            All Subjects
          </button>
          <button
            className={`btn ${teacherSubjectFilter === 'my' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            onClick={() => setTeacherSubjectFilter('my')}
          >
            My Authorized Subjects ({currentUser.authorizedSubjectIds?.length || 0})
          </button>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search assignments..." />
      </div>

      <AssignmentFilters filters={filters} onFilterChange={handleFilterChange} />

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
          icon={FileText}
          title="No assignments found"
          description={
            search || filters.subject || filters.status || filters.priority
              ? 'Try adjusting your filters.'
              : isTeacher
              ? 'Publish an assignment to get started.'
              : 'You have no assignments scheduled.'
          }
          action={
            canCreate ? (
              <button className="btn btn-primary" onClick={handleCreate}>
                <Plus size={18} />
                Add Assignment
              </button>
            ) : null
          }
        />
      )}

      <AssignmentModal
        isOpen={modalOpen}
        mode={modalMode}
        onClose={handleCloseModal}
        assignment={selectedAssignment}
      />
    </>
  );
}
