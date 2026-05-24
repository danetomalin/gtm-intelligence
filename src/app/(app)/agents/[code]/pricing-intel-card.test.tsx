import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PricingIntelCard, type PricingIntel } from "./pricing-intel-card";

const baseIntel: PricingIntel = {
  id: "pi-1",
  competitor_name: "Crayon",
  snapshot_date: "2026-05-22",
  pricing_model: "tiered",
  tiers: [
    {
      name: "Starter",
      price: "$995",
      unit: "month",
      features: ["3 competitors tracked", "Weekly battlecard refresh"],
    },
    {
      name: "Growth",
      price: "Custom",
      unit: "annual",
      features: ["Unlimited competitors", "Slack alerts", "API access"],
    },
  ],
  packaging_observations:
    "Two tiers plus enterprise quote. Mid-market squeeze on Growth.",
  pricing_velocity: "recently_changed",
  recent_changes: "Starter tier added 2026-05-10, replacing a flat $1,500 plan.",
  positioning_implications: "We should emphasize the multi-tenant story.",
  sources: "crayon.co/pricing",
};

describe("PricingIntelCard", () => {
  it("renders competitor, snapshot date, pricing model, and velocity badge in full mode", () => {
    render(<PricingIntelCard intel={baseIntel} />);
    expect(screen.getByText("Crayon")).toBeInTheDocument();
    expect(screen.getByText("2026-05-22")).toBeInTheDocument();
    expect(screen.getByText("Tiered")).toBeInTheDocument();
    expect(screen.getByText("Just changed")).toBeInTheDocument();
  });

  it("renders each tier with name + price in full mode", () => {
    render(<PricingIntelCard intel={baseIntel} />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText(/\$995/)).toBeInTheDocument();
  });

  it("renders recent changes and so-what in full mode", () => {
    render(<PricingIntelCard intel={baseIntel} />);
    expect(screen.getByText("Recent changes")).toBeInTheDocument();
    expect(screen.getByText(/Starter tier added/)).toBeInTheDocument();
    expect(screen.getByText("So what")).toBeInTheDocument();
  });

  it("hides tier grid, recent changes, and so-what in compact mode", () => {
    render(<PricingIntelCard intel={baseIntel} compact />);
    expect(screen.queryByText("Recent changes")).not.toBeInTheDocument();
    expect(screen.queryByText("So what")).not.toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
  });

  it("renders sparse data without crashing", () => {
    const sparse: PricingIntel = {
      id: "pi-2",
      competitor_name: null,
      snapshot_date: null,
      pricing_model: null,
      tiers: null,
      packaging_observations: null,
      pricing_velocity: null,
      recent_changes: null,
      positioning_implications: null,
      sources: null,
    };
    render(<PricingIntelCard intel={sparse} />);
    expect(screen.getByText("Unknown competitor")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
