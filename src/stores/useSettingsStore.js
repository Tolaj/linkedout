import { create } from "zustand";

const useSettingsStore = create((set) => ({
  googleClientId: localStorage.getItem("google_client_id") || "",
  folderName: localStorage.getItem("linkedout_folder") || "",

  setGoogleClientId: (id) => {
    localStorage.setItem("google_client_id", id);
    set({ googleClientId: id });
  },

  setFolderName: (name) => {
    localStorage.setItem("linkedout_folder", name);
    set({ folderName: name });
  },
}));

export default useSettingsStore;
