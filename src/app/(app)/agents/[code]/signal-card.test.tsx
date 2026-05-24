import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignalCard, type Signal } from "./signal-card";

const baseSignal: Signal = {
  id: "sig-1",
  signal_date: "2026-05-22",
  category: "competitive_positioning",
  headline: "Competitor launches new tier",
  summary: "Pricing dropped on the mid-tier plan.",
  strategic_commentary: "We should respond by emphasising our value tier.",
  impact_score: 8,
  sentiment: "bearish",
  sentiment_reason: "directly threatens mid-market positioning",
};

describe("SignalCard", () => {
  it("renders the headline, summary, and strategic commentary in full mode", () => {
    render(<SignalCard signal={baseSignal} />);
    expect(screen.getByText("Competitor launches new tier")).toBeInTheDocument();
    expect(
      screen.getByText("Pricing dropped on the mid-tier plan."),
    ).toBeInTheDocument();
    expect(screen.getByText(/we should respond/i)).toBeInTheDocument();
    expect(screen.getByText("So what")).toBeInTheDocument();
  });

  it("hides strategic commentary in compact mode", () => {
    render(<SignalCard signal={baseSignal} compact />);
    expect(screen.queryByText("So what")).not.toBeInTheDocument();
    expect(screen.queryByText(/we should respond/i)).not.toBeInTheDocument();
  });

  it("renders the impact score and sentiment chip", () => {
    render(<SignalCard signal={baseSignal} />);
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByText("bearish")).toBeInTheDocument();
  });

  it("renders gracefully with mostly-null fields", () => {
    const sparse: Signal = {
      id: "sig-2",
      signal_date: null,
      category: null,
      headline: "Bare headline",
      summary: null,
      strategic_commentary: null,
      impact_score: null,
      sentiment: null,
      sentiment_reason: null,
    };
    render(<SignalCard signal={sparse} />);
    expect(screen.getByText("Bare headline")).toBeInTheDocument();
    expect(screen.getByText("—/10")).toBeInTheDocument();
  });

  it("applies bullish-toned styling when sentiment is bullish", () => {
    render(<SignalCard signal={{ ...baseSignal, sentiment: "bullish" }} />);
    const chip = screen.getByText("bullish");
    expect(chip.className).toMatch(/bg-win-bg/);
  });
});
