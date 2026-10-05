import type { Lang } from "../i18n";
import type { ResolvedCategory, Trip } from "../../domain";

/** A category's name: custom ones as typed, standard ones in the interface language (SPEC.md §7.7). */
export const categoryName = (category: ResolvedCategory, lang: Lang): string => category.name ?? category.names?.[lang] ?? "";

/** Position in the order of entry, which picks an avatar colour. */
export const avatarIndex = (trip: Trip, participantId: string): number => trip.roster.findIndex((r) => r.id === participantId);
