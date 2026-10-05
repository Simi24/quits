import type { Dictionary } from "../dictionary";
import { balances } from "./balances";
import { charts } from "./charts";
import { create } from "./create";
import { expenses } from "./expenses";
import { settings } from "./settings";
import { shell } from "./shell";

export const en: Dictionary = { shell, create, expenses, balances, charts, settings };
