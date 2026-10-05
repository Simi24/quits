import type { Dictionary } from "../dictionary";
import { balances } from "./balances";
import { charts } from "./charts";
import { create } from "./create";
import { expenses } from "./expenses";
import { history } from "./history";
import { manage } from "./manage";
import { onboarding } from "./onboarding";
import { privacy } from "./privacy";
import { pwa } from "./pwa";
import { settings } from "./settings";
import { shell } from "./shell";
import { sync } from "./sync";
import { totals } from "./totals";

export const en: Dictionary = { shell, create, expenses, balances, charts, settings, manage, totals, sync, history, privacy, onboarding, pwa };
