import { type CourseInterestStatus } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import * as operations from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import {
  LandingCountryFilter,
  LandingContactItem,
  LandingContactList,
  LandingContactMeta,
  LandingCourseContactSection,
  LandingContactSectionTitle,
  LandingCountryOption,
  LandingHiddenCountryOption,
  LandingCourseActionsRow,
  LandingCourseEnrolledLabel,
  LandingCourseItem,
  LandingCourseList,
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
  LandingSchoolContactSection,
  LandingSchoolIdentityRow,
  LandingSchoolLocation,
  LandingSchoolLogo,
  LandingSchoolLogoPlaceholder,
  LandingSchoolTextColumn,
  LandingSchoolWebsite,
  LandingStatusText,
} from "../../../client/components/patterns/LandingPagePatterns";
import { MutedText, PrimaryText, SectionTitle } from "../../../client/components/patterns/PagePrimitives";
import { Button } from "../../../client/components/ui/button";
import { toast } from "../../../shared/hooks/use-toast";

const {
  cancelMyCourseInterest,
  getLandingSchoolsWithCourses,
  expressInterestInCourse,
  useQuery,
} = operations as any;

type LandingCourse = {
  id: string;
  title: string;
  startDate: string | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  totalPrice: number;
  instructorContacts: LandingContact[];
  canExpressInterest: boolean;
  viewerInterestId: string | null;
  viewerInterestStatus: LandingCourseInterestStatus | null;
};

type LandingContact = {
  userId: string;
  displayName: string;
  email: string;
  phone: string | null;
};

type LandingSchool = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  city: string;
  country: string;
  managerContacts: LandingContact[];
  courses: LandingCourse[];
};

type LandingCourseInterestStatus = CourseInterestStatus;

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

type CourseInterestState = {
  interestId: string | null;
  status: LandingCourseInterestStatus | null;
};

function isInterestedState(status: LandingCourseInterestStatus | null): boolean {
  return status !== null && status !== "ENROLLED" && status !== "CANCELLED";
}

function isEnrollmentLocked(status: LandingCourseInterestStatus | null): boolean {
  return status === "ENROLLED";
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
  const [interestStateByCourseId, setInterestStateByCourseId] = useState<
    Map<string, CourseInterestState>
  >(new Map());
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
    const nextStates = new Map<string, CourseInterestState>();
    for (const school of schools) {
      for (const course of school.courses) {
        nextStates.set(course.id, {
          interestId: course.viewerInterestId,
          status: course.viewerInterestStatus,
        });
      }
    }
    setInterestStateByCourseId(nextStates);
  }, [schools]);

  async function handleCourseInterestAction(
    courseId: string,
    options?: { shouldClearPendingAnonymousIntentOnCompletion?: boolean },
  ) {
    if (!user) return;
    if (inFlightInterestsRef.current.has(courseId)) return;

    const existingInterestState = interestStateByCourseId.get(courseId) ?? {
      interestId: null,
      status: null,
    };

    if (isEnrollmentLocked(existingInterestState.status)) {
      return;
    }

    inFlightInterestsRef.current.add(courseId);
    setPendingInterests((prev) => new Set(prev).add(courseId));

    try {
      const shouldCancel = isInterestedState(existingInterestState.status);

      if (shouldCancel && !existingInterestState.interestId) {
        toast({ title: t("landing.interestCancelErrorTitle"), variant: "destructive" });
        return;
      }

      const result = shouldCancel
        ? await cancelMyCourseInterest({ interestId: existingInterestState.interestId })
        : await expressInterestInCourse({ courseId });
      const status = (result?.status as LandingCourseInterestStatus | undefined) ?? null;

      setInterestStateByCourseId((prev) => {
        const next = new Map(prev);
        next.set(courseId, {
          interestId: (result?.id as string | undefined) ?? existingInterestState.interestId,
          status,
        });
        return next;
      });

      if (shouldCancel) {
        toast({
          title: t("landing.interestCancelledTitle"),
          description: t("landing.interestCancelledDescription"),
        });
      } else {
        toast({
          title: t("landing.interestExpressedTitle"),
          description: t("landing.interestExpressedDescription"),
        });
      }
    } catch {
      const shouldCancel = isInterestedState(existingInterestState.status);
      toast({
        title: shouldCancel ? t("landing.interestCancelErrorTitle") : t("landing.interestErrorTitle"),
        variant: "destructive",
      });
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

    void handleCourseInterestAction(pendingIntent.courseId, {
      shouldClearPendingAnonymousIntentOnCompletion: true,
    });
  }, [user, isLoading, schools, interestStateByCourseId]);

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
                      <SectionTitle>{school.name}</SectionTitle>
                      <LandingSchoolLocation>
                        {school.city}, {school.country}
                      </LandingSchoolLocation>
                    </LandingSchoolTextColumn>
                  </LandingSchoolIdentityRow>
                  {school.websiteUrl && (
                    <LandingSchoolWebsite href={school.websiteUrl}>{t("landing.website")}</LandingSchoolWebsite>
                  )}
                </LandingSchoolHeaderRow>

                {user && school.managerContacts.length > 0 && (
                  <LandingSchoolContactSection testId="landing-school-manager-contacts">
                    <LandingContactSectionTitle>{t("landing.schoolManagerContacts")}</LandingContactSectionTitle>
                    <LandingContactList>
                      {school.managerContacts.map((contact) => (
                        <LandingContactItem key={contact.userId} testId="landing-school-manager-contact-item">
                          <PrimaryText>{contact.displayName}</PrimaryText>
                          <LandingContactMeta>{contact.email}</LandingContactMeta>
                          {contact.phone ? <LandingContactMeta>{contact.phone}</LandingContactMeta> : null}
                        </LandingContactItem>
                      ))}
                    </LandingContactList>
                  </LandingSchoolContactSection>
                )}

                <LandingCourseList>
                  {school.courses.map((course) => (
                    <LandingCourseItem key={course.id}>
                      <LandingCourseTitle>{course.title}</LandingCourseTitle>
                      <MutedText>
                        {t("landing.startsLabel")} {formatDate(course.startDate, i18n.language, t("landing.dateToBeAnnounced"))}
                      </MutedText>
                      <MutedText>
                        {t("landing.totalPriceLabel", { price: course.totalPrice })}
                      </MutedText>
                      {(course.minCapacity !== null || course.maxCapacity !== null) && (
                        <MutedText>
                          {t("landing.capacityLabel")} {course.minCapacity ?? "?"} - {course.maxCapacity ?? "?"}
                        </MutedText>
                      )}
                      {user && course.instructorContacts.length > 0 && (
                        <LandingCourseContactSection testId="landing-course-instructor-contacts">
                          <LandingContactSectionTitle>{t("landing.assignedInstructorContacts")}</LandingContactSectionTitle>
                          <LandingContactList>
                            {course.instructorContacts.map((contact) => (
                              <LandingContactItem
                                key={`${course.id}-${contact.userId}`}
                                testId="landing-course-instructor-contact-item"
                              >
                              <PrimaryText>{contact.displayName}</PrimaryText>
                                <LandingContactMeta>{contact.email}</LandingContactMeta>
                                {contact.phone ? <LandingContactMeta>{contact.phone}</LandingContactMeta> : null}
                              </LandingContactItem>
                            ))}
                          </LandingContactList>
                        </LandingCourseContactSection>
                      )}
                      <LandingCourseActionsRow>
                        {user && interestStateByCourseId.get(course.id)?.status === "ENROLLED" ? (
                          <LandingCourseEnrolledLabel>
                            {t("landing.enrolledLabel")}
                          </LandingCourseEnrolledLabel>
                        ) : user ? (
                          <Button
                            size="sm"
                            variant={isInterestedState(interestStateByCourseId.get(course.id)?.status ?? null) ? "secondary" : "outline"}
                            disabled={
                              !course.canExpressInterest ||
                              pendingInterests.has(course.id) ||
                              isEnrollmentLocked(interestStateByCourseId.get(course.id)?.status ?? null)
                            }
                            onClick={() => void handleCourseInterestAction(course.id)}
                            data-testid="express-interest-btn"
                          >
                            {pendingInterests.has(course.id)
                              ? isInterestedState(interestStateByCourseId.get(course.id)?.status ?? null)
                                ? t("landing.interestCancelling")
                                : t("landing.interestSending")
                              : isInterestedState(interestStateByCourseId.get(course.id)?.status ?? null)
                              ? t("landing.interestedConfirmed")
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
