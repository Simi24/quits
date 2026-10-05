import { AVATAR_TINT } from "./categoryTint";

interface AvatarProps {
  name: string;
  /** Position in the order of entry: picks the colour. */
  index: number;
  size?: "md" | "sm";
}

export const Avatar = ({ name, index, size = "md" }: AvatarProps) => (
  <span
    aria-hidden="true"
    className={`grid flex-none place-items-center rounded-full font-extrabold text-ink ${AVATAR_TINT[Math.max(index, 0) % AVATAR_TINT.length]} ${
      size === "md" ? "size-[38px] text-[15px]" : "size-8 text-[13px]"
    }`}
  >
    {name.trim()[0]?.toUpperCase() ?? "?"}
  </span>
);
