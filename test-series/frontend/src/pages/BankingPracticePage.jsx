import { useEffect } from "react";

const DEFAULT_TOPIC = "Inequality";

export default function BankingPracticePage() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const topic = query.get("topic") || DEFAULT_TOPIC;
    const setId = query.get("setId") || "";

    const nextQuery = new URLSearchParams({ topic });
    if (setId) {
      nextQuery.set("setId", setId);
    }

    // Redirect to the runner page (test path) so the full runner mounts
    // and can load sets/questions. Include mode=practice by default.
    nextQuery.set("mode", "practice");
    window.location.replace(`/tests?${nextQuery.toString()}`);
  }, []);

  return <p>Opening practice sets...</p>;
}
