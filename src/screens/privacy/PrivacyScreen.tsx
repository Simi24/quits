import { ArrowLeft } from "@phosphor-icons/react";
import { Segmented } from "../../components";
import { useDevice } from "../../device";
import { Section, sectionClass, headingClass } from "./Section";

const CONTACT = "quits@simonepetta.com";
const CLOUDFLARE_POLICY = "https://www.cloudflare.com/privacypolicy/";

const link = "font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink";

/** The privacy page: IT/EN following the device language, reachable from the landing and the trip footer (SPEC.md §10.2). */
export const PrivacyScreen = () => {
  const { t, lang, setLang } = useDevice();
  const p = t.privacy;
  return (
    <main className="h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <a className={`${link} inline-flex min-h-11 items-center gap-2 text-[14.5px]`} href="/">
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          {t.shell.backHome}
        </a>
        <div className="w-[120px]">
          <Segmented
            label={t.settings.lang}
            value={lang}
            onChange={setLang}
            options={[
              { value: "it", label: "IT" },
              { value: "en", label: "EN" },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-6 px-5 pt-6 pb-10">
        <header className="grid gap-3">
          <h1 className="display text-[calc(52px*var(--d-scale))] leading-[.95]">{p.title}</h1>
          <p className="max-w-[34ch] text-[17px] leading-[1.4]">{p.intro}</p>
        </header>
        <section aria-labelledby="privacy-stored" className={sectionClass}>
          <h2 id="privacy-stored" className={headingClass}>
            {p.storedH}
          </h2>
          <ul className="grid list-disc gap-2.5 pl-5 text-[15px] marker:text-ink-2">
            {p.stored.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <Section id="where" title={p.whereH}>
          <p>{p.where}</p>
        </Section>
        <Section id="how-long" title={p.howLongH}>
          <p>{p.howLong}</p>
        </Section>
        <Section id="delete" title={p.deleteH}>
          <p>{p.delete}</p>
        </Section>
        <Section id="export" title={p.exportH}>
          <p>{p.export}</p>
        </Section>
        <Section id="logs" title={p.logsH}>
          <p>{p.logs}</p>
        </Section>
        <Section id="cloudflare" title={p.cloudflareH}>
          <p>{p.cloudflare}</p>
          <p>
            <a className={link} href={CLOUDFLARE_POLICY} rel="noopener">
              {p.cloudflareLink}
            </a>
          </p>
        </Section>
        <Section id="contact" title={p.contactH}>
          <p>
            {p.contact}{" "}
            <a className={link} href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </div>
    </main>
  );
};
