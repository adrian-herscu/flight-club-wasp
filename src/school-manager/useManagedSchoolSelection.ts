import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "school-manager:selected-school-id";
const EVENT_NAME = "school-manager-selection-changed";

type ManagedSchoolLike = {
  id: string;
};

function readStoredSchoolId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function broadcastSelectionChange(schoolId: string | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { schoolId } })
    );
  }
}

export function useManagedSchoolSelection<T extends ManagedSchoolLike>(schools: T[]) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => readStoredSchoolId());

  // Listen for selection changes from other components
  useEffect(() => {
    const handleSelectionChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ schoolId: string | null }>;
      setSelectedSchoolId(customEvent.detail.schoolId);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENT_NAME, handleSelectionChange);
      return () => window.removeEventListener(EVENT_NAME, handleSelectionChange);
    }
  }, []);

  // Synchronize selection with available schools
  useEffect(() => {
    if (schools.length === 0) {
      setSelectedSchoolId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    // Check if current selection is still valid
    const isCurrentSelectionValid = selectedSchoolId && schools.some((s) => s.id === selectedSchoolId);
    
    if (isCurrentSelectionValid) {
      // Selection is still valid, keep it
      return;
    }

    // Selection is invalid or not set, use first school
    const newSchoolId = schools[0].id;
    setSelectedSchoolId(newSchoolId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newSchoolId);
    }
  }, [schools, selectedSchoolId]);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? schools[0] ?? null,
    [schools, selectedSchoolId],
  );

  const updateSelectedSchoolId = (schoolId: string) => {
    const normalized = schoolId.trim();
    const nextValue = normalized.length > 0 ? normalized : null;
    setSelectedSchoolId(nextValue);

    if (typeof window !== "undefined") {
      if (nextValue) {
        window.localStorage.setItem(STORAGE_KEY, nextValue);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      // Broadcast the change to other hook instances in the same window
      broadcastSelectionChange(nextValue);
    }
  };

  return {
    selectedSchoolId,
    selectedSchool,
    setSelectedSchoolId: updateSelectedSchoolId,
  };
}
