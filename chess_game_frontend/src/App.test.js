import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders lobby link", () => {
  render(<App />);
  const lobby = screen.getByText(/lobby/i);
  expect(lobby).toBeInTheDocument();
});

