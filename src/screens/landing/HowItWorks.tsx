import { Receipt } from "../../components";
import { useDevice } from "../../device";

/** "Come funziona": the three steps as one receipt, one line each, dotted rules between (SPEC.md §7.6 item 1). */
export const HowItWorks = () => {
  const { t } = useDevice();
  return (
    <section aria-labelledby="how-title" className="grid gap-3.5 px-4 pb-7" data-testid="how-it-works">
      <h2 id="how-title" className="display text-[calc(20px*var(--d-scale))]">
        {t.onboarding.howTitle}
      </h2>
      <Receipt className="px-5 pt-[26px] pb-[30px]">
        <ol className="grid">
          {t.onboarding.howSteps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5 border-t-2 border-dotted border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0">
              <span aria-hidden="true" className="display num grid size-8 place-items-center rounded-full border-2 border-dashed border-ink-2 text-[15px]">
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold leading-tight">{step.title}</h3>
                <p className="mt-0.5 text-sm text-ink-2">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Receipt>
    </section>
  );
};
