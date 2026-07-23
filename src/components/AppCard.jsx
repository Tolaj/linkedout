import { ExternalLink } from "lucide-react";
import { KANBAN_COLUMNS, CLOSED_STATUSES, STAGE_COLOR } from "../lib/constants";
import useAppStore from "../stores/useAppStore";

export default function AppCard({ app, color, onOpen }) {
  const moveStage = useAppStore((s) => s.moveStage);
  const isClosed = CLOSED_STATUSES.includes(app.status);
  const colStatus = isClosed ? "Closed" : app.status;
  const stageIdx = KANBAN_COLUMNS.indexOf(colStatus);

  function handleBarClick(e, col, i) {
    e.stopPropagation();
    if (col === "Closed") {
      moveStage(app.id, "Rejected");
    } else {
      moveStage(app.id, col);
    }
  }

  return (
    <div
      className="group bg-base-700 border border-base-600 hover:border-base-500 rounded-lg p-3 cursor-pointer transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-medium text-sm leading-snug">{app.company}</div>
        {app.link && (
          <a
            href={app.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-base-400 hover:text-accent flex-shrink-0"
            aria-label="Open job posting"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="text-xs text-base-200 mb-1">{app.role}</div>

      {isClosed && (
        <div className="mb-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${STAGE_COLOR[app.status]?.bg || ""} ${STAGE_COLOR[app.status]?.text || ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STAGE_COLOR[app.status]?.dot || ""}`} />
            {app.status}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-base-400 font-mono">
          {app.dateApplied || "—"}
        </span>
        {app.referral === "Y" && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>
            referral
          </span>
        )}
      </div>

      <div className="flex gap-1 mt-2">
        {KANBAN_COLUMNS.map((col, i) => (
          <button
            key={col}
            title={col}
            aria-label={`Move to ${col}`}
            onClick={(e) => handleBarClick(e, col, i)}
            className={`h-2 flex-1 rounded-full transition-all ${
              i <= stageIdx ? color.dot : "bg-base-600"
            } hover:scale-y-150 hover:brightness-125 cursor-pointer`}
          />
        ))}
      </div>
    </div>
  );
}
