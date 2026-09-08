import { SUBJECTS } from '../../data/subjects';

export default function AssignmentFilters({ filters, onFilterChange }) {
  return (
    <div className="assignments-controls">
      <select
        className="filter-select"
        value={filters.subject}
        onChange={(e) => onFilterChange('subject', e.target.value)}
        aria-label="Filter by subject"
      >
        <option value="">All Subjects</option>
        {SUBJECTS.map(s => (
          <option key={s.id} value={s.id}>{s.code}</option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      <select
        className="filter-select"
        value={filters.priority}
        onChange={(e) => onFilterChange('priority', e.target.value)}
        aria-label="Filter by priority"
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        className="filter-select"
        value={filters.sort}
        onChange={(e) => onFilterChange('sort', e.target.value)}
        aria-label="Sort by"
      >
        <option value="deadline-asc">Nearest Deadline</option>
        <option value="deadline-desc">Farthest Deadline</option>
        <option value="priority">Priority</option>
        <option value="status">Status</option>
      </select>
    </div>
  );
}
