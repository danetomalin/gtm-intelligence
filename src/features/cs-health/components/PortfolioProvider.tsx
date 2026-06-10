"use client";
// Provides the portfolio data set (Supabase-loaded or mock) to every
// CS Health tab. Defaults to the mock DATA so components render
// standalone (tests, storybook) without a provider.

import { createContext, useContext } from "react";
import { DATA, type PortfolioData } from "@/features/cs-health/lib/generateData";

const PortfolioContext = createContext<PortfolioData>(DATA);

export function PortfolioProvider({
  data,
  children,
}: {
  data: PortfolioData;
  children: React.ReactNode;
}) {
  return <PortfolioContext.Provider value={data}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioData {
  return useContext(PortfolioContext);
}
