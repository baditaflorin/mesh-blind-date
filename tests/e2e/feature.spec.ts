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
  } finally {
    await cleanup();
  }
});
