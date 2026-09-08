export default function StatCard({ icon: Icon, number, label, sub, color, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: bgColor, color: color }}>
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
        <div className="stat-sub">{sub}</div>
      </div>
    </div>
  );
}
