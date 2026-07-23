import { create } from "zustand";

const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = "error") => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
}));

export default useToastStore;
