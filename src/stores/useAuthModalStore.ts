import { create } from 'zustand';

export interface AuthModalFeature {
  iconSrc: string;
  text: string;
}

export interface AuthModalConfig {
  heroIconSrc: string;
  title: string;
  description: string;
  features: AuthModalFeature[];
}

interface AuthModalState extends AuthModalConfig {
  isOpen: boolean;
  openModal: (config: AuthModalConfig) => void;
  closeModal: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  heroIconSrc: "/context/icons 6/bell.svg",
  title: "Stay ahead of the law.",
  description: "Join CEKA today to receive real-time updates.",
  features: [],
  openModal: (config) => set({ isOpen: true, ...config }),
  closeModal: () => set({ isOpen: false }),
}));
