import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import McqQuestions, { type McqQuestion } from "@/app/components/mcq-questions";

function questions(n: number): McqQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    q: `Question ${i + 1}`,
    options: ["Alpha", "Beta", "Gamma", "Delta"],
    answer: i % 4,
  }));
}

describe("McqQuestions", () => {
  it("renders the question text with an index", () => {
    render(<McqQuestions questions={questions(3)} />);
    expect(screen.getByText("1. Question 1")).toBeInTheDocument();
    expect(screen.getByText("3. Question 3")).toBeInTheDocument();
  });

  it("shows 0 answered and 0 score initially", () => {
    render(<McqQuestions questions={questions(5)} />);
    expect(screen.getAllByText("0/5")).toHaveLength(2);
  });

  it("selects an option and updates the answered count", () => {
    render(<McqQuestions questions={questions(1)} />);
    fireEvent.click(screen.getByRole("button", { name: /Beta/ }));
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("awards a score for correct answers", () => {
    render(<McqQuestions questions={[{ q: "q", options: ["Alpha", "Beta"], answer: 0 }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
    expect(screen.getAllByText("1/1")).toHaveLength(2);
  });

  it("does not award a score for incorrect answers", () => {
    render(<McqQuestions questions={[{ q: "q", options: ["Alpha", "Beta"], answer: 0 }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Beta/ }));
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("disables options after selection", () => {
    render(<McqQuestions questions={questions(1)} />);
    const button = screen.getByRole("button", { name: /Alpha/ });
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });

  it("paginates after 10 questions", () => {
    render(<McqQuestions questions={questions(12)} />);
    expect(screen.getByText("1. Question 1")).toBeInTheDocument();
    expect(screen.queryByText("11. Question 11")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("11. Question 11")).toBeInTheDocument();
    expect(screen.queryByText("1. Question 1")).not.toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last", () => {
    render(<McqQuestions questions={questions(11)} />);
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("button", { name: /Previous/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("does not show pagination for a single page", () => {
    render(<McqQuestions questions={questions(3)} />);
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });

  it("renders an empty page for no questions without crashing", () => {
    const { container } = render(<McqQuestions questions={[]} />);
    expect(container).toBeTruthy();
    expect(screen.getAllByText("0/0")).toHaveLength(2);
  });
});
