import { FooterLinks } from "../../components";
import { useDevice } from "../../device";

/** The footer of the trip shell, at the bottom of Viaggio: "di Simone Petta", code, privacy (SPEC.md §13, "way back"). */
export const TripFooter = () => {
  const { t } = useDevice();
  return (
    <footer aria-label={t.manage.footerLabel} className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t-[1.5px] border-dashed border-line pt-5 text-[14.5px]">
      <FooterLinks />
    </footer>
  );
};
