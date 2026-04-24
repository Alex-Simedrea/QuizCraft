"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DashboardHeaderConfig = {
  actions?: ReactNode;
  backButton?: boolean | { disabled?: boolean; label?: string };
  title?: string;
  titleAlign?: "center" | "left";
  titlePrefix?: ReactNode;
};

type DashboardHeaderContextValue = {
  config: DashboardHeaderConfig;
  setConfig: (config: DashboardHeaderConfig) => void;
};

const DashboardHeaderContext =
  createContext<DashboardHeaderContextValue | null>(null);

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DashboardHeaderConfig>({});
  const value = useMemo(() => ({ config, setConfig }), [config]);

  return (
    <DashboardHeaderContext.Provider value={value}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader(config: DashboardHeaderConfig) {
  const context = useContext(DashboardHeaderContext);
  const setConfig = context?.setConfig;

  useEffect(() => {
    if (!setConfig) return;

    setConfig(config);
    return () => setConfig({});
  }, [config, setConfig]);
}

export function useDashboardHeaderConfig() {
  return useContext(DashboardHeaderContext)?.config ?? {};
}
