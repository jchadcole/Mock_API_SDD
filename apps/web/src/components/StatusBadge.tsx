interface StatusBadgeProps {
  label: string;
  tone: "success" | "danger" | "neutral" | "warning";
}

const toneClasses: Record<StatusBadgeProps["tone"], string> = {
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
};

export default function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
