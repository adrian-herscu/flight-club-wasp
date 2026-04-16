import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "instructor:selected-school-id";
const EVENT_NAME = "instructor-selection-changed";

type InstructorSchoolLike = {
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
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { schoolId } }));
  }
}

export function useInstructorSchoolSelection<T extends InstructorSchoolLike>(schools: T[]) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => readStoredSchoolId());

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

  useEffect(() => {
    if (schools.length === 0) {
      setSelectedSchoolId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
        broadcastSelectionChange(null);
      }
      return;
    }

    const isCurrentSelectionValid =
      selectedSchoolId && schools.some((s) => s.id === selectedSchoolId);

    if (isCurrentSelectionValid) {
      return;
    }

    const newSchoolId = schools[0].id;
    setSelectedSchoolId(newSchoolId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newSchoolId);
      broadcastSelectionChange(newSchoolId);
    }
  }, [schools, selectedSchoolId]);

  const effectiveSelectedSchoolId = useMemo(
    () => selectedSchoolId ?? schools[0]?.id ?? null,
    [schools, selectedSchoolId],
  );

  const selectedSchool = useMemo(
    () =>
      schools.find((school) => school.id === effectiveSelectedSchoolId) ?? schools[0] ?? null,
    [effectiveSelectedSchoolId, schools],
  );

  const setSchoolId = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, schoolId);
      broadcastSelectionChange(schoolId);
    }
  };

  return {
    selectedSchool,
    selectedSchoolId: effectiveSelectedSchoolId,
    setSelectedSchoolId: setSchoolId,
  };
}
