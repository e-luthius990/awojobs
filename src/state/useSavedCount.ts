import { useEffect, useState } from "react";
import { subscribe, getSavedCount, hydrateSaved } from "./saved.store";

export function useSavedCount() {
  const [count, setCount] = useState(getSavedCount());

  useEffect(() => {
    let mounted = true;

    hydrateSaved().then(() => {
      if (mounted) {
        setCount(getSavedCount());
      }
    });

    const unsubscribe = subscribe(setCount);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return count;
}
