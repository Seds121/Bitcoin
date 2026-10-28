"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h1>Something broke while loading this page.</h1>
      <p>Reload to try again. If it keeps happening, the data provider may be down.</p>
      <button className="btn btn-primary" onClick={reset}>
        Reload
      </button>
    </div>
  );
}
