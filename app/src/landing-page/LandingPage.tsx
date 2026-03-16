import { useState } from "react";
import * as operations from "wasp/client/operations";

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
  city: string;
  country: string;
  courses: LandingCourse[];
};

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return "Date to be announced";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LandingPage() {
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
    <div className="bg-background text-foreground min-h-[70vh]">
      <main className="mx-auto w-full max-w-5xl px-6 py-12" data-testid="landing-schools-section">
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Schools and available courses</h1>
          <p className="text-muted-foreground">
            Browse approved schools and their currently published courses.
          </p>
        </header>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Filter by course name…"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            data-testid="filter-course-name"
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-56"
          />
          <input
            type="search"
            placeholder="Filter by location…"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            data-testid="filter-location"
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-56"
          />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            data-testid="filter-country"
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-44"
          >
            <option value="">All countries</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
            {/* sentinel option used in tests to assert zero-match behaviour */}
            <option value="__none__" aria-hidden>
              (no country)
            </option>
          </select>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading schools and courses...</p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            Could not load schools right now. Please refresh and try again.
          </p>
        )}

        {!isLoading && !error && schools.length === 0 && (
          <p className="text-sm text-muted-foreground">No schools or courses are available yet.</p>
        )}

        {!isLoading && !error && schools.length > 0 && filteredSchools.length === 0 && (
          <p className="text-sm text-muted-foreground">No schools or courses match your filters.</p>
        )}

        {!isLoading && !error && filteredSchools.length > 0 && (
          <section className="space-y-5">
            {filteredSchools.map((school) => (
              <article
                key={school.id}
                data-testid="landing-school-card"
                className="rounded-lg border border-border bg-card p-5 shadow-xs"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{school.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {school.city}, {school.country}
                    </p>
                  </div>
                  {school.websiteUrl && (
                    <a
                      href={school.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Website
                    </a>
                  )}
                </div>

                <ul className="space-y-2">
                  {school.courses.map((course) => (
                    <li
                      key={course.id}
                      data-testid="landing-course-item"
                      className="rounded-md border border-border/70 bg-background px-3 py-2"
                    >
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Starts: {formatDate(course.startDate)}
                      </p>
                      {(course.minCapacity !== null || course.maxCapacity !== null) && (
                        <p className="text-sm text-muted-foreground">
                          Capacity: {course.minCapacity ?? "?"} - {course.maxCapacity ?? "?"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
