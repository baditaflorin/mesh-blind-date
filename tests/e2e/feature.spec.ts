import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("both like → mutual match revealed", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("about you (one or two sentences)").fill("loves rust");
    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("about you (one or two sentences)").fill("loves baking");

    await a
      .locator(".bd-list li")
      .first()
      .getByRole("button", { name: /❤️ like/ })
      .click();
    await b
      .locator(".bd-list li")
      .first()
      .getByRole("button", { name: /❤️ like/ })
      .click();

    await a.getByRole("button", { name: /reveal mutual matches/ }).click();
    await expect(a.locator(".bd-banner")).toContainText("1 mutual");

    // The match must also surface on B — the OPPOSITE peer. The advertised
    // claim is a *mutual* reveal, so bob (who likes alice and is liked back)
    // must independently see the match once he reveals.
    await b.getByRole("button", { name: /reveal mutual matches/ }).click();
    await expect(b.locator(".bd-banner")).toContainText("1 mutual");
  } finally {
    await cleanup();
  }
});

test("one-sided like is NOT a match on either peer (reciprocity gate)", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("carol");
    await b.getByPlaceholder("your name").fill("dave");

    // carol likes dave...
    await a
      .locator(".bd-list li")
      .first()
      .getByRole("button", { name: /❤️ like/ })
      .click();
    // ...but dave passes carol. No mutual interest exists.
    await b
      .locator(".bd-list li")
      .first()
      .getByRole("button", { name: /🤷 pass/ })
      .click();

    // carol's like must propagate to dave (cross-peer), proving the vote
    // synced — yet neither side may show a match.
    await expect(b.getByText(/2 votes/)).toBeVisible();

    await a.getByRole("button", { name: /reveal mutual matches/ }).click();
    await b.getByRole("button", { name: /reveal mutual matches/ }).click();

    // The "mutual" gate must reject the one-sided like on BOTH peers:
    // the reveal toggles on (status shows "0 mutual matches") but no banner
    // and no per-card "💞 mutual!" badge appears for either user.
    await expect(a.getByText(/0 mutual matches/)).toBeVisible();
    await expect(b.getByText(/0 mutual matches/)).toBeVisible();
    await expect(a.locator(".bd-banner")).toHaveCount(0);
    await expect(b.locator(".bd-banner")).toHaveCount(0);
    await expect(a.locator(".bd-match")).toHaveCount(0);
    await expect(b.locator(".bd-match")).toHaveCount(0);
  } finally {
    await cleanup();
  }
});
