import useToastStore from "../stores/useToastStore";

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
            t.type === "error"
              ? "bg-[#DC2626] text-white"
              : "bg-[#16A34A] text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
