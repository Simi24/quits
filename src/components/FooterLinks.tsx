import { useDevice } from "../device";
import { PRIVACY_PATH } from "../screens/privacy/route";

const AUTHOR = { it: "https://simonepetta.com/", en: "https://simonepetta.com/en/" } as const;
const REPO = "https://github.com/Simi24/quits";

const link = "relative font-semibold before:absolute before:-inset-x-1 before:-inset-y-[11px] before:content-['']  underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink";

/** "di Simone Petta", code, privacy: the way back of the landing and of the trip shell (SPEC.md §13). */
export const FooterLinks = () => {
  const { t, lang } = useDevice();
  return (
    <>
      <a className={link} href={AUTHOR[lang]} rel="noopener">
        {t.manage.by}
      </a>
      <a className={link} href={REPO} rel="noopener">
        {t.manage.code}
      </a>
      <a className={link} href={PRIVACY_PATH}>
        {t.manage.privacy}
      </a>
    </>
  );
};
