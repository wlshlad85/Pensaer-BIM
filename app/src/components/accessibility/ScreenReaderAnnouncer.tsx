/**
 * Screen Reader Announcer Component
 *
 * Provides a live region for announcing updates to screen readers.
 * Use the announceToScreenReader function from utils/accessibility.ts to trigger announcements.
 */

import { useEffect, useState } from "react";

// Global event for announcements
const ANNOUNCE_EVENT = "pensaer:announce";

interface AnnounceDetail {
  message: string;
  priority: "polite" | "assertive";
}

/**
 * Trigger an announcement to screen readers
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite"
) {
  window.dispatchEvent(
    new CustomEvent<AnnounceDetail>(ANNOUNCE_EVENT, {
      detail: { message, priority },
    })
  );
}

export function ScreenReaderAnnouncer() {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  useEffect(() => {
    const handleAnnounce = (event: CustomEvent<AnnounceDetail>) => {
      const { message, priority } = event.detail;

      if (priority === "assertive") {
        // Clear and reset to trigger announcement
        setAssertiveMessage("");
        setTimeout(() => setAssertiveMessage(message), 50);
      } else {
        setPoliteMessage("");
        setTimeout(() => setPoliteMessage(message), 50);
      }
    };

    window.addEventListener(
      ANNOUNCE_EVENT,
      handleAnnounce as EventListener
    );
    return () => {
      window.removeEventListener(
        ANNOUNCE_EVENT,
        handleAnnounce as EventListener
      );
    };
  }, []);

  return (
    <>
      {/* Polite announcements - wait for user to finish current task */}
      <div
        id="sr-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements - interrupt immediately for important updates */}
      <div
        id="sr-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  );
}

export default ScreenReaderAnnouncer;
