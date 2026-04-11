import { type ReactNode } from "react";
import { NavLink } from "react-router";

export const StudentCoursesPageRoot = ({
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) => <div data-testid={testId}>{children}</div>;

export const StudentCoursesLoadingText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-2">{children}</p>
);

export const StudentCoursesEmptyText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-8">{children}</p>
);

export const StudentCoursesList = ({ children }: { children: ReactNode }) => (
  <ul className="space-y-2">{children}</ul>
);

export const StudentCourseListItem = ({
  title,
  subtitle,
  href,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  href?: string;
}) => {
  const inner = (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
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