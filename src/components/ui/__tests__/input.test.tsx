import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders correctly", () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter text" />);
    expect(getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("handles text input", async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText } = render(<Input placeholder="Type here" />);

    const input = getByPlaceholderText("Type here");
    await user.type(input, "Hello World");

    expect(input).toHaveValue("Hello World");
  });

  it("handles onChange events", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { getByPlaceholderText } = render(<Input onChange={handleChange} placeholder="Test" />);

    await user.type(getByPlaceholderText("Test"), "a");
    expect(handleChange).toHaveBeenCalled();
  });

  it("can be disabled", () => {
    const { getByPlaceholderText } = render(<Input disabled placeholder="Disabled" />);
    expect(getByPlaceholderText("Disabled")).toBeDisabled();
  });

  it("supports different types", () => {
    const { getByPlaceholderText, rerender } = render(<Input type="email" placeholder="Email" />);
    expect(getByPlaceholderText("Email")).toHaveAttribute("type", "email");

    rerender(<Input type="password" placeholder="Password" />);
    expect(getByPlaceholderText("Password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("applies custom className", () => {
    const { getByPlaceholderText } = render(<Input className="custom-class" placeholder="Custom" />);
    expect(getByPlaceholderText("Custom")).toHaveClass("custom-class");
  });
});
