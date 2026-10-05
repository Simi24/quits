import { z } from "zod";

export const idSchema = z.string().min(1).max(100);
export type ParticipantId = string;
export type Money = number;
