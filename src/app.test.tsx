// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "#/entry-server";
import { App } from "./app";

beforeEach(() => {
    (
        globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    vi.stubGlobal(
        "WebSocket",
        class {
            close() {}
            addEventListener() {}
        },
    );
    vi.stubGlobal("matchMedia", () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
    }));
    class Observer {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    vi.stubGlobal("ResizeObserver", Observer);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

test.each(["/", "/404"])("%s hydrates without mismatches", async (path) => {
    const container = document.createElement("div");
    container.innerHTML = render(path);
    document.body.append(container);

    const errors: unknown[] = [];
    const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation((...args) => {
            errors.push(args);
        });
    await act(async () => {
        hydrateRoot(container, <App path={path} />, {
            onRecoverableError: (error) => errors.push(error),
        });
    });
    consoleError.mockRestore();

    expect(errors).toEqual([]);
    expect(container.querySelector(".page")).not.toBeNull();
});
