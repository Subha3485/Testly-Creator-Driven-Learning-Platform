import { useEffect } from "react";

const DEFAULT_TOPIC = "RDBMS";

export default function GatePracticePage() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const topic = query.get("topic") || DEFAULT_TOPIC;
    const setId = query.get("setId") || "";

    const nextQuery = new URLSearchParams({ topic });
    if (setId) {
      nextQuery.set("setId", setId);
    }

    // Redirect to the runner page so the full runner mounts and can load sets/questions.
    nextQuery.set("mode", "practice");
    window.location.replace(`/gate/practice/run/test?${nextQuery.toString()}`);
  }, []);

  return <p>Opening GATE practice sets...</p>;
}
