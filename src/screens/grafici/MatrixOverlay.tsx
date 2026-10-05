import type { ChartModel } from "../../../domain";
import { Overlay, Receipt } from "../../components";
import { useDevice } from "../../device";
import { HeatTable } from "./HeatTable";
import { WhoFilter } from "./WhoFilter";

interface MatrixOverlayProps {
  model: ChartModel;
  who: string | null;
  onWho: (who: string | null) => void;
  onClose: () => void;
}

/** Persona per categoria, one tap away from Per categoria, with the same filter (SPEC.md §8.1). */
export const MatrixOverlay = ({ model, who, onWho, onClose }: MatrixOverlayProps) => {
  const { t } = useDevice();
  return (
    <Overlay title={t.charts.cMat} onClose={onClose}>
      <div className="charts">
        <WhoFilter who={who} onChange={onWho} />
        <div className="grid gap-4 px-4 pt-1.5 pb-7 md:px-6">
          <p className="text-[15px]">{t.charts.matSub}</p>
          <Receipt className="grid gap-3.5 px-[18px] pt-[22px] pb-6">
            <HeatTable model={model} />
          </Receipt>
        </div>
      </div>
    </Overlay>
  );
};
