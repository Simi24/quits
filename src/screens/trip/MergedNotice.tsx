import { Button, Notice } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";

/**
 * A device whose "chi sei?" was X when X was merged into Y becomes Y, and says so (SPEC.md §3.3). Reading
 * the notice makes it permanent; until then undoing the merge brings X back.
 */
export const MergedNotice = () => {
  const { t } = useDevice();
  const { mergedAway, nameOf, chooseMe } = useTrip();
  if (!mergedAway) return null;
  return (
    <div className="px-4 pb-2" role="status">
      <Notice>
        <p>{t.manage.mergedNotice(nameOf(mergedAway.fromId), nameOf(mergedAway.intoId))}</p>
        <div>
          <Button size="sm" variant="ghost" onClick={() => void chooseMe(mergedAway.intoId)}>
            {t.manage.mergedOk}
          </Button>
        </div>
      </Notice>
    </div>
  );
};
