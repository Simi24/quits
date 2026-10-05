import { useDevice } from "../../device";

const AUTHOR = { it: "https://simonepetta.com/", en: "https://simonepetta.com/en/" } as const;
const REPO = "https://github.com/Simi24/quits";
/** Placeholder: the privacy page itself arrives with S5 (SPEC.md §10.2, G-B7). */
export const PRIVACY_PATH = "/privacy";

const link = "font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink";

/** The footer of the trip shell, at the bottom of Viaggio: "di Simone Petta", code, privacy (SPEC.md §13, "way back"). */
export const TripFooter = () => {
  const { t, lang } = useDevice();
  return (
    <footer aria-label={t.manage.footerLabel} className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t-[1.5px] border-dashed border-line pt-5 text-[14.5px]">
      <a className={link} href={AUTHOR[lang]} rel="noopener">
        {t.manage.by}
      </a>
      <a className={link} href={REPO} rel="noopener">
        {t.manage.code}
      </a>
      <a className={link} href={PRIVACY_PATH}>
        {t.manage.privacy}
      </a>
    </footer>
  );
};
