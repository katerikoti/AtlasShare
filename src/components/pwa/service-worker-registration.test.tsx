import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ServiceWorkerRegistration } from "./service-worker-registration";

afterEach(() => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: undefined,
  });
});

describe("ServiceWorkerRegistration", () => {
  it("renders nothing when service workers are unavailable", () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container).toBeEmptyDOMElement();
  });
});
