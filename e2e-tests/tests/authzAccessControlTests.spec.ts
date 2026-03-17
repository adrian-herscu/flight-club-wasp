import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("authorization and protected route access", () => {
  const callOperation = async (
    page: Page,
    operationSlug: string,
    args: unknown,
  ) => {
    const sessionId = await page.evaluate(() => {
      const raw = localStorage.getItem("wasp:sessionId") ?? localStorage.getItem("sessionId");
      if (!raw) return null;

      try {
        return JSON.parse(raw) as string;
      } catch {
        return raw;
      }
    });

    const candidates = [
      `/operations/${operationSlug}`,
      `/api/operations/${operationSlug}`,
      `http://127.0.0.1:3001/operations/${operationSlug}`,
      `http://localhost:3001/operations/${operationSlug}`,
    ];

    let lastResponse = null as Awaited<ReturnType<Page["request"]["post"]>> | null;

    for (const path of candidates) {
      const response = await page.request.post(path, {
        headers: sessionId
          ? {
              Authorization: `Bearer ${sessionId}`,
            }
          : undefined,
        data: {
          json: args,
        },
      });

      lastResponse = response;

      if (response.status() !== 404) {
        return response;
      }
    }

    if (!lastResponse) {
      throw new Error("Failed to call operation endpoint.");
    }

    return lastResponse;
  };

  test("[STD-AUTH-003] unauthenticated users are redirected to login for protected routes", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login(?:[?#].*)?$/);
  });

  test("[STD-AUTH-007] non-admin users cannot access admin-only pages", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+user.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
  });

  test("[STD-AUTH-008] non-manager users cannot access manager-only member request pages", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin/member-requests/instructors");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("manager-member-request-card")).toHaveCount(0);
  });

  test("[STD-AUTH-009][STD-ADM-006] non-admin users cannot execute admin-only school approval actions directly", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+user.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    const response = await callOperation(
      page,
      "approve-school-manager-request",
      { requestId: "not-a-real-id" },
    );

    expect(response.status()).toBe(403);
    await expect(response.text()).resolves.toContain("Only system admins can access this resource.");
  });

  test("[STD-AUTH-009][STD-MGR-011] non-managers cannot execute manager-only member approval actions directly", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    const response = await callOperation(
      page,
      "approve-school-member-request",
      { requestId: "not-a-real-id" },
    );

    expect(response.status()).toBe(403);
    await expect(response.text()).resolves.toContain("Only school managers can access this resource.");
  });
});
