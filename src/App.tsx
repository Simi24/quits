import { EqualMark } from "./components/EqualMark";

export const App = () => (
  <main className="grid min-h-full place-items-center bg-paper px-4">
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-3">
        <EqualMark />
        <h1 className="display text-[calc(56px*var(--d-scale))]">quits</h1>
      </div>
      <p className="max-w-[28ch] text-ink-2">Chi ha pagato cosa in vacanza, e come tornare pari.</p>
    </div>
  </main>
);
