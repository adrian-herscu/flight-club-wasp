import { useEffect, useRef, useState } from "react";
import * as operations from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import {
  LandingCountryFilter,
  LandingCountryOption,
  LandingHiddenCountryOption,
  LandingCourseActionsRow,
  LandingCourseEnrolledLabel,
  LandingCourseItem,
  LandingCourseList,
  LandingCourseMeta,
  LandingCourseTitle,
  LandingFilterBar,
  LandingFilterInput,
  LandingPageHeader,
  LandingPageMain,
  LandingPageShell,
  LandingPageSubtitle,
  LandingPageTitle,
  LandingResultsSection,
  LandingSchoolCard,
  LandingSchoolHeaderRow,
  LandingSchoolIdentityRow,
  LandingSchoolLocation,
  LandingSchoolLogo,
  LandingSchoolLogoPlaceholder,
  LandingSchoolName,
  LandingSchoolTextColumn,
  LandingSchoolWebsite,
  LandingStatusText,
} from "../client/components/patterns/LandingPagePatterns";
import { Button } from "../client/components/ui/button";
import { toast } from "../client/hooks/use-toast";

const { getLandingSchoolsWithCourses, expressInterestInCourse, useQuery } = operations as any;

type LandingCourse = {
  id: string;
  title: string;
  startDate: string | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  canExpressInterest: boolean;
  viewerInterestStatus: LandingCourseInterestStatus | null;
};

type LandingSchool = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  city: string;
  country: string;
  courses: LandingCourse[];
};

type LandingCourseInterestStatus = "INTERESTED" | "CONTACTED" | "ENROLLED" | "CANCELLED";

type PendingAnonymousInterestIntent = {
  courseId: string;
  createdAt: number;
};

const PENDING_ANONYMOUS_INTEREST_KEY = "landing.pendingAnonCourseInterest";
const PENDING_ANONYMOUS_INTEREST_TTL_MS = 24 * 60 * 60 * 1000;

function readPendingAnonymousInterestIntent(): PendingAnonymousInterestIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_ANONYMOUS_INTEREST_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingAnonymousInterestIntent;
    const isValid =
      typeof parsed?.courseId === "string" &&
      parsed.courseId.length > 0 &&
      typeof parsed?.createdAt === "number";

    if (!isValid) {
      window.localStorage.removeItem(PENDING_ANONYMOUS_INTEREST_KEY);
      return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_ANONYMOUS_INTEREST_TTL_MS) {
      window.localStorage.removeItem(PENDING_ANONYMOUS_INTEREST_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(PENDING_ANONYMOUS_INTEREST_KEY);
    return null;
  }
}

function savePendingAnonymousInterestIntent(courseId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (readPendingAnonymousInterestIntent()) {
    return false;
  }

  const payload: PendingAnonymousInterestIntent = {
    courseId,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(PENDING_ANONYMOUS_INTEREST_KEY, JSON.stringify(payload));
  return true;
}

function clearPendingAnonymousInterestIntent(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_ANONYMOUS_INTEREST_KEY);
}

function shouldDisableInterestButtonByStatus(status: LandingCourseInterestStatus | null): boolean {
  return status === "INTERESTED" || status === "CONTACTED" || status === "ENROLLED";
}

function formatDate(dateValue: string | null, language: string, fallbackText: string): string {
  if (!dateValue) {
    return fallbackText;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return fallbackText;
  }

  return date.toLocaleDateString(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useQuery(getLandingSchoolsWithCourses);
  const { data: user } = useAuth();
  const schools = (data as LandingSchool[] | undefined) ?? [];

  const [courseFilter, setCourseFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [pendingInterests, setPendingInterests] = useState<Set<string>>(new Set());
  const [interestStatusesByCourseId, setInterestStatusesByCourseId] = useState<Map<string, LandingCourseInterestStatus>>(new Map());
  const [anonymousFlowLocked, setAnonymousFlowLocked] = useState(false);
  const inFlightInterestsRef = useRef<Set<string>>(new Set());
  const anonymousRedirectLockedRef = useRef(false);
  const hasProcessedPendingAnonymousIntentRef = useRef(false);

  const normalise = (s: string) => s.toLowerCase().trim();

  // Derive sorted unique country codes/names from loaded data
  const countryOptions = Array.from(new Set(schools.map((s) => s.country))).sort();

  const filteredSchools = schools
    .map((school) => {
      const courseTerm = normalise(courseFilter);
      const filteredCourses = courseTerm
        ? school.courses.filter((c) => normalise(c.title).includes(courseTerm))
        : school.courses;
      return { ...school, courses: filteredCourses };
    })
    .filter((school) => {
      if (school.courses.length === 0) return false;
      if (countryFilter && school.country !== countryFilter) return false;
      const locTerm = normalise(locationFilter);
      if (!locTerm) return true;
      return (
        normalise(school.city).includes(locTerm) ||
        normalise(school.country).includes(locTerm)
      );
    });

  useEffect(() => {
    setAnonymousFlowLocked(Boolean(readPendingAnonymousInterestIntent()));
  }, []);

  useEffect(() => {
    const nextStatuses = new Map<string, LandingCourseInterestStatus>();
    for (const school of schools) {
      for (const course of school.courses) {
        if (course.viewerInterestStatus) {
          nextStatuses.set(course.id, course.viewerInterestStatus);
        }
      }
    }
    setInterestStatusesByCourseId(nextStatuses);
  }, [schools]);

  async function submitCourseInterest(
    courseId: string,
    options?: { shouldClearPendingAnonymousIntentOnCompletion?: boolean },
  ) {
    if (!user) return;
    if (inFlightInterestsRef.current.has(courseId)) return;

    const existingStatus = interestStatusesByCourseId.get(courseId) ?? null;
    if (shouldDisableInterestButtonByStatus(existingStatus)) {
      return;
    }

    inFlightInterestsRef.current.add(courseId);
    setPendingInterests((prev) => new Set(prev).add(courseId));

    try {
      const result = await expressInterestInCourse({ courseId });
      const status = (result?.status as LandingCourseInterestStatus | undefined) ?? "INTERESTED";
      setInterestStatusesByCourseId((prev) => {
        const next = new Map(prev);
        next.set(courseId, status);
        return next;
      });
      toast({ title: t("landing.interestExpressedTitle"), description: t("landing.interestExpressedDescription") });
    } catch {
      toast({ title: t("landing.interestErrorTitle"), variant: "destructive" });
    } finally {
      if (options?.shouldClearPendingAnonymousIntentOnCompletion) {
        clearPendingAnonymousInterestIntent();
      }

      inFlightInterestsRef.current.delete(courseId);
      setPendingInterests((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  }

  function handleAnonymousInterest(courseId: string) {
    if (anonymousRedirectLockedRef.current) {
      return;
    }

    anonymousRedirectLockedRef.current = true;
    savePendingAnonymousInterestIntent(courseId);
    setAnonymousFlowLocked(true);
    window.location.assign("/login");
  }

  useEffect(() => {
    if (!user || isLoading || hasProcessedPendingAnonymousIntentRef.current) {
      return;
    }

    const pendingIntent = readPendingAnonymousInterestIntent();
    if (!pendingIntent) {
      return;
    }

    hasProcessedPendingAnonymousIntentRef.current = true;

    const isTargetCourseActionable = schools.some((school) =>
      school.courses.some(
        (course) =>
          course.id === pendingIntent.courseId &&
          course.canExpressInterest,
      ),
    );

    if (!isTargetCourseActionable) {
      clearPendingAnonymousInterestIntent();
      return;
    }

    void submitCourseInterest(pendingIntent.courseId, {
      shouldClearPendingAnonymousIntentOnCompletion: true,
    });
  }, [user, isLoading, schools]);

  return (
    <LandingPageShell>
      <LandingPageMain testId="landing-schools-section">
        <LandingPageHeader>
          <LandingPageTitle>{t("landing.schoolsAndCoursesTitle")}</LandingPageTitle>
          <LandingPageSubtitle>
            {t("landing.schoolsAndCoursesSubtitle")}
          </LandingPageSubtitle>
        </LandingPageHeader>

        <LandingFilterBar>
          <LandingFilterInput
            placeholder={t("landing.filterByCourseNamePlaceholder")}
            value={courseFilter}
            onChange={setCourseFilter}
            testId="filter-course-name"
          />
          <LandingFilterInput
            placeholder={t("landing.filterByLocationPlaceholder")}
            value={locationFilter}
            onChange={setLocationFilter}
            testId="filter-location"
          />
          <LandingCountryFilter
            value={countryFilter}
            onChange={setCountryFilter}
            testId="filter-country"
          >
            <LandingCountryOption value="">{t("landing.allCountries")}</LandingCountryOption>
            {countryOptions.map((country) => (
              <LandingCountryOption key={country} value={country}>
                {country}
              </LandingCountryOption>
            ))}
            <LandingHiddenCountryOption value="__none__">
              {t("landing.noCountry")}
            </LandingHiddenCountryOption>
          </LandingCountryFilter>
        </LandingFilterBar>

        {isLoading && (
          <LandingStatusText>{t("landing.loadingSchoolsAndCourses")}</LandingStatusText>
        )}

        {error && (
          <LandingStatusText tone="danger">
            {t("landing.loadSchoolsError")}
          </LandingStatusText>
        )}

        {!isLoading && !error && schools.length === 0 && (
          <LandingStatusText>{t("landing.noSchoolsOrCoursesYet")}</LandingStatusText>
        )}

        {!isLoading && !error && schools.length > 0 && filteredSchools.length === 0 && (
          <LandingStatusText>{t("landing.noSchoolsMatchFilters")}</LandingStatusText>
        )}

        {!isLoading && !error && filteredSchools.length > 0 && (
          <LandingResultsSection>
            {filteredSchools.map((school) => (
              <LandingSchoolCard key={school.id}>
                <LandingSchoolHeaderRow>
                  <LandingSchoolIdentityRow>
                    {school.logoUrl ? (
                      <LandingSchoolLogo src={school.logoUrl} alt={school.name} />
                    ) : (
                      <LandingSchoolLogoPlaceholder label={t("landing.logoPlaceholderLabel", { schoolName: school.name })}>
                        {school.name.charAt(0).toUpperCase()}
                      </LandingSchoolLogoPlaceholder>
                    )}
                    <LandingSchoolTextColumn>
                      <LandingSchoolName>{school.name}</LandingSchoolName>
                      <LandingSchoolLocation>
                        {school.city}, {school.country}
                      </LandingSchoolLocation>
                    </LandingSchoolTextColumn>
                  </LandingSchoolIdentityRow>
                  {school.websiteUrl && (
                    <LandingSchoolWebsite href={school.websiteUrl}>{t("landing.website")}</LandingSchoolWebsite>
                  )}
                </LandingSchoolHeaderRow>

                <LandingCourseList>
                  {school.courses.map((course) => (
                    <LandingCourseItem key={course.id}>
                      <LandingCourseTitle>{course.title}</LandingCourseTitle>
                      <LandingCourseMeta>
                        {t("landing.startsLabel")} {formatDate(course.startDate, i18n.language, t("landing.dateToBeAnnounced"))}
                      </LandingCourseMeta>
                      {(course.minCapacity !== null || course.maxCapacity !== null) && (
                        <LandingCourseMeta>
                          {t("landing.capacityLabel")} {course.minCapacity ?? "?"} - {course.maxCapacity ?? "?"}
                        </LandingCourseMeta>
                      )}
                      <LandingCourseActionsRow>
                        {user && interestStatusesByCourseId.get(course.id) === "ENROLLED" ? (
                          <LandingCourseEnrolledLabel>
                            {t("landing.enrolledLabel")}
                          </LandingCourseEnrolledLabel>
                        ) : user ? (
                          <Button
                            size="sm"
                            variant={shouldDisableInterestButtonByStatus(interestStatusesByCourseId.get(course.id) ?? null) ? "secondary" : "outline"}
                            disabled={
                              !course.canExpressInterest ||
                              pendingInterests.has(course.id) ||
                              shouldDisableInterestButtonByStatus(interestStatusesByCourseId.get(course.id) ?? null)
                            }
                            onClick={() => void submitCourseInterest(course.id)}
                            data-testid="express-interest-btn"
                          >
                            {shouldDisableInterestButtonByStatus(interestStatusesByCourseId.get(course.id) ?? null)
                              ? t("landing.interestedConfirmed")
                              : pendingInterests.has(course.id)
                                ? t("landing.interestSending")
                                : t("landing.imInterested")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!course.canExpressInterest || anonymousFlowLocked}
                            onClick={() => handleAnonymousInterest(course.id)}
                            data-testid="express-interest-login-btn"
                          >
                            {t("landing.imInterested")}
                          </Button>
                        )}
                      </LandingCourseActionsRow>
                    </LandingCourseItem>
                  ))}
                </LandingCourseList>
              </LandingSchoolCard>
            ))}
          </LandingResultsSection>
        )}
      </LandingPageMain>
    </LandingPageShell>
  );
}
