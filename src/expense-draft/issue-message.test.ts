import { describe, expect, it } from "vitest";
import { dictionaries } from "../i18n";
import { isLiveIssue, issueMessage } from "./issue-message";

const money = (minor: number) => `${(minor / 100).toFixed(2).replace(".", ",")} €`;

describe("issueMessage", () => {
  it("uses the prototype's Italian wording", () => {
    const t = dictionaries.it.expenses;
    expect(issueMessage({ code: "exact_missing", missing: 1000 }, "exact", t, money, "it")).toBe("Mancano 10,00 € da assegnare.");
    expect(issueMessage({ code: "payers_over", excess: 250 }, "equal", t, money, "it")).toBe("I paganti superano il totale di 2,50 €.");
    expect(issueMessage({ code: "percentage_total", total: 80.5 }, "percentage", t, money, "it")).toBe("Le percentuali fanno 80,5%: devono fare 100%.");
  });

  it("uses the prototype's English wording and a dot decimal", () => {
    const t = dictionaries.en.expenses;
    expect(issueMessage({ code: "percentage_total", total: 80.5 }, "percentage", t, money, "en")).toBe("Percentages add up to 80.5%: they must make 100%.");
  });

  it("asks for a person or for a share depending on the method", () => {
    const t = dictionaries.it.expenses;
    expect(issueMessage({ code: "split_nobody" }, "equal", t, money, "it")).toBe("Scegli almeno una persona.");
    expect(issueMessage({ code: "split_nobody" }, "shares", t, money, "it")).toBe("Dai almeno una quota a qualcuno.");
  });
});

describe("isLiveIssue", () => {
  it("reports split and payer problems as you type, and the rest only after a save attempt", () => {
    expect(isLiveIssue({ code: "exact_missing", missing: 1 })).toBe(true);
    expect(isLiveIssue({ code: "payers_short", missing: 1 })).toBe(true);
    expect(isLiveIssue({ code: "description_missing" })).toBe(false);
    expect(isLiveIssue({ code: "amount_zero" })).toBe(false);
  });
});
