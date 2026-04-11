import { type ReactNode } from "react";
import { NavLink } from "react-router";

export const InstructorCoursesPageRoot = ({
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) => <div data-testid={testId}>{children}</div>;

export const InstructorCoursesLoadingText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-2">{children}</p>
);

export const InstructorCoursesEmptyText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-8">{children}</p>
);

export const InstructorCoursesList = ({ children }: { children: ReactNode }) => (
  <ul className="space-y-2">{children}</ul>
);

export const InstructorCourseListItem = ({
  title,
  subtitle,
  status,
  href,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  status: ReactNode;
  href?: string;
}) => {
  const inner = (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs font-medium">{status}</span>
      </div>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
    </div>
  );
  return (
    <li>
      {href ? (
        <NavLink to={href} className="block hover:opacity-80 transition-opacity">
          {inner}
        </NavLink>
      ) : (
        inner
      )}
    </li>
  );
};
