import { useState } from "react";
import * as operations from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import {
  LandingCountryFilter,
  LandingCountryOption,
  LandingHiddenCountryOption,
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

const { getLandingSchoolsWithCourses, useQuery } = operations as any;

type LandingCourse = {
  id: string;
  title: string;
  startDate: string | null;
  minCapacity: number | null;
  maxCapacity: number | null;
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
  const schools = (data as LandingSchool[] | undefined) ?? [];

  const [courseFilter, setCourseFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

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
