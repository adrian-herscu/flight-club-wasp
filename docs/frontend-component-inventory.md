## Frontend Component Inventory

Scope: route-declared pages from `main.wasp`, deduplicated to unique React page components.

Classification rule: `generic` for shared UI/layout/pattern infrastructure; `domain specific` for business-feature or feature-coupled components.
Action rule: `keep` = cross-page import, foundational infrastructure, encapsulates HTML markup that cannot legally live in a page file (enforced by `scripts/enforce-ui-boundary.mjs`), or carries genuine variant/behaviour logic; `delete` = thin wrapper around a single existing abstraction with no logic — the named export adds no value over calling the wrapped component directly at its patterns-file call site; `consolidate → X` = identical implementation to an existing generic X — delete this export and replace all call sites with X; `promote` = currently single-page but generic enough to serve multiple pages.

Unique page components inventoried: 23
Page-component rows: 238

## Reused Route Pages

| Page | Routes | File |
| --- | --- | --- |
| AdminDashboard | /school-manager, /system-admin | src/admin/dashboards/analytics/AnalyticsDashboardPage.tsx |
| CourseDetailPage | /instructor/courses/:courseId, /school-manager/courses/:courseId, /student/courses/:courseId | src/course-execution/CourseDetailPage.tsx |
| ManagerRequestsPage | /school-manager/member-requests/instructors, /school-manager/member-requests/students | src/school-manager/ManagerRequestsDashboardPage.tsx |
| ManagerSyllabusesPage | /school-manager/syllabuses, /system-admin/syllabuses | src/school-manager/ManagerSyllabusesPage.tsx |

## Inventory Table

| Page | Imported component | Classification | Action |
| --- | --- | --- | --- |
| Account | AppCard | generic | keep |
| Account | AppPageInset | generic | keep |
| Account | Button | generic | keep |
| Account | CardContent | generic | keep |
| Account | CardHeader | generic | keep |
| Account | CardTitle | generic | keep |
| Account | ContentStack | generic | keep |
| Account | EndAlignedActions | generic | keep |
| Account | FieldRow | generic | keep |
| Account | FormStack | generic | keep |
| Account | Input | generic | keep |
| Account | InsetBlock | generic | keep |
| Account | ReadOnlyFieldRow | generic | keep |
| Account | Separator | generic | keep |
| AdminDashboard | DashboardPlaceholderContainer | domain specific | keep |
| AdminDashboard | DashboardPlaceholderText | domain specific | keep |
| AdminDashboard | DefaultLayout | generic | keep |
| AdminMessages | DefaultLayout | generic | keep |
| AdminMessages | MessagesPageText | domain specific | delete |
| AdminSchoolRequestsPage | Breadcrumb | generic | keep |
| AdminSchoolRequestsPage | Button | generic | keep |
| AdminSchoolRequestsPage | Card | generic | keep |
| AdminSchoolRequestsPage | CardHeader | generic | keep |
| AdminSchoolRequestsPage | CardTitle | generic | keep |
| AdminSchoolRequestsPage | DefaultLayout | generic | keep |
| AdminSchoolRequestsPage | DetailRow | generic | keep |
| AdminSchoolRequestsPage | EndActionsRow | generic | keep |
| AdminSchoolRequestsPage | LabeledInputField | generic | keep |
| AdminSchoolRequestsPage | MutedText | generic | keep |
| AdminSchoolRequestsPage | PrimaryText | generic | keep |
| AdminSchoolRequestsPage | SchoolRequestsDetailsLogoRow | domain specific | keep |
| AdminSchoolRequestsPage | SchoolRequestsExpandableDetails | domain specific | keep |
| AdminSchoolRequestsPage | SchoolRequestsFilterGroup | domain specific | consolidate → ManagerRequestsFilterGroup |
| AdminSchoolRequestsPage | SchoolRequestsRejectionReasonField | domain specific | consolidate → ManagerRequestsRejectionReasonField |
| AdminSchoolRequestsPage | SchoolRequestsRequesterSummary | domain specific | keep |
| AdminSchoolRequestsPage | SchoolRequestsSnapshot | domain specific | keep |
| AdminSchoolRequestsPage | SpacedCardContent | generic | delete |
| AdminSchoolRequestsPage | TitledSection | generic | keep |
| AdminSettings | Breadcrumb | generic | keep |
| AdminSettings | Button | generic | keep |
| AdminSettings | Card | generic | keep |
| AdminSettings | CardContent | generic | keep |
| AdminSettings | CardHeader | generic | keep |
| AdminSettings | CardTitle | generic | keep |
| AdminSettings | DefaultLayout | generic | keep |
| AdminSettings | FileUploadZone | generic | keep |
| AdminSettings | Input | generic | keep |
| AdminSettings | PhotoAvatarRow | generic | keep |
| AdminSettings | PhotoUploadForm | generic | keep |
| AdminSettings | SettingsActionRow | generic | keep |
| AdminSettings | SettingsColumnsGrid | generic | keep |
| AdminSettings | SettingsFieldBlock | generic | keep |
| AdminSettings | SettingsFieldLabel | generic | keep |
| AdminSettings | SettingsForm | generic | keep |
| AdminSettings | SettingsHalfField | generic | keep |
| AdminSettings | SettingsInputWithIcon | generic | keep |
| AdminSettings | SettingsMainColumn | generic | keep |
| AdminSettings | SettingsPageContent | generic | keep |
| AdminSettings | SettingsSideColumn | generic | keep |
| AdminSettings | SettingsTextareaWithIcon | generic | keep |
| AdminSettings | SettingsTwoColumnRow | generic | keep |
| AdminUsers | Breadcrumb | generic | keep |
| AdminUsers | DefaultLayout | generic | keep |
| AdminUsers | UsersBox | domain specific | keep |
| AdminUsers | UsersTable | domain specific | keep |
| CourseDetailPage | ActionsBar | generic | keep |
| CourseDetailPage | AssessmentStudentRow | domain specific | keep |
| CourseDetailPage | AttendanceHintRow | domain specific | keep |
| CourseDetailPage | BelowCapacityLeadBar | domain specific | keep |
| CourseDetailPage | BelowCapacityManagerBar | domain specific | keep |
| CourseDetailPage | Breadcrumb | generic | keep |
| CourseDetailPage | Button | generic | keep |
| CourseDetailPage | CoInstructorAbsenceRow | domain specific | keep |
| CourseDetailPage | ConfirmDialog | generic | keep |
| CourseDetailPage | CourseLessonListItem | domain specific | keep |
| CourseDetailPage | CourseLifecycleStatusBadge | domain specific | keep |
| CourseDetailPage | DefaultLayout | generic | keep |
| CourseDetailPage | ErrorText | generic | keep |
| CourseDetailPage | HeaderSection | generic | keep |
| CourseDetailPage | InstructorAssignmentSection | domain specific | keep |
| CourseDetailPage | LateEnrollmentSection | domain specific | keep |
| CourseDetailPage | LoadingText | generic | keep |
| CourseDetailPage | MetaItem | generic | keep |
| CourseDetailPage | MetaRow | generic | keep |
| CourseDetailPage | PageRoot | generic | keep |
| CourseDetailPage | PendingRefundItem | domain specific | keep |
| CourseDetailPage | PresenceHintRow | domain specific | keep |
| CourseDetailPage | RefundRequestModal | domain specific | keep |
| CourseDetailPage | RefundRequestSection | domain specific | keep |
| CourseDetailPage | ScheduleLessonSheet | domain specific | keep |
| CourseDetailPage | SectionHeading | generic | keep |
| CourseDetailPage | SectionTitle | generic | keep |
| CourseDetailPage | SimpleList | generic | keep |
| CourseDetailPage | StackSection | generic | keep |
| CourseDetailPage | StartCourseGuardList | domain specific | keep |
| CourseDetailPage | SubSection | generic | keep |
| EmailVerification | AuthInlineLink | generic | keep |
| EmailVerification | AuthPageLayout | generic | keep |
| InstructorCoursesPage | Breadcrumb | generic | keep |
| InstructorCoursesPage | DefaultLayout | generic | keep |
| InstructorCoursesPage | EmptyText | generic | keep |
| InstructorCoursesPage | ListItem | generic | keep |
| InstructorCoursesPage | LoadingText | generic | keep |
| InstructorCoursesPage | PageRoot | generic | keep |
| InstructorCoursesPage | SimpleList | generic | keep |
| InstructorDashboardPage | CenteredPlaceholder | generic | keep |
| InstructorDashboardPage | DefaultLayout | generic | keep |
| LandingPage | Button | generic | keep |
| LandingPage | LandingContactItem | domain specific | keep |
| LandingPage | LandingContactList | domain specific | keep |
| LandingPage | LandingContactMeta | domain specific | keep |
| LandingPage | LandingContactName | domain specific | consolidate → PrimaryText |
| LandingPage | LandingContactSectionTitle | domain specific | keep |
| LandingPage | LandingCountryFilter | domain specific | keep |
| LandingPage | LandingCountryOption | domain specific | keep |
| LandingPage | LandingCourseActionsRow | domain specific | keep |
| LandingPage | LandingCourseContactSection | domain specific | keep |
| LandingPage | LandingCourseEnrolledLabel | domain specific | keep |
| LandingPage | LandingCourseItem | domain specific | keep |
| LandingPage | LandingCourseList | domain specific | keep |
| LandingPage | LandingCourseMeta | domain specific | consolidate → MutedText |
| LandingPage | LandingCourseTitle | domain specific | keep |
| LandingPage | LandingFilterBar | domain specific | keep |
| LandingPage | LandingFilterInput | domain specific | keep |
| LandingPage | LandingHiddenCountryOption | domain specific | keep |
| LandingPage | LandingPageHeader | domain specific | keep |
| LandingPage | LandingPageMain | domain specific | keep |
| LandingPage | LandingPageShell | domain specific | keep |
| LandingPage | LandingPageSubtitle | domain specific | keep |
| LandingPage | LandingPageTitle | domain specific | keep |
| LandingPage | LandingResultsSection | domain specific | keep |
| LandingPage | LandingSchoolCard | domain specific | keep |
| LandingPage | LandingSchoolContactSection | domain specific | keep |
| LandingPage | LandingSchoolHeaderRow | domain specific | keep |
| LandingPage | LandingSchoolIdentityRow | domain specific | keep |
| LandingPage | LandingSchoolLocation | domain specific | consolidate → MutedText |
| LandingPage | LandingSchoolLogo | domain specific | keep |
| LandingPage | LandingSchoolLogoPlaceholder | domain specific | keep |
| LandingPage | LandingSchoolName | domain specific | consolidate → SectionTitle |
| LandingPage | LandingSchoolTextColumn | domain specific | keep |
| LandingPage | LandingSchoolWebsite | domain specific | keep |
| LandingPage | LandingStatusText | domain specific | keep |
| Login | AuthInlineLink | generic | keep |
| Login | AuthPageLayout | generic | keep |
| Login | AuthTitle | generic | keep |
| Login | TranslatedLoginForm | domain specific | keep |
| ManagerCoursesPage | Breadcrumb | generic | keep |
| ManagerCoursesPage | Button | generic | keep |
| ManagerCoursesPage | Card | generic | keep |
| ManagerCoursesPage | CardHeader | generic | keep |
| ManagerCoursesPage | CardTitle | generic | keep |
| ManagerCoursesPage | DefaultLayout | generic | keep |
| ManagerCoursesPage | Dialog | generic | keep |
| ManagerCoursesPage | DialogContent | generic | keep |
| ManagerCoursesPage | DialogDescription | generic | keep |
| ManagerCoursesPage | DialogFooter | generic | keep |
| ManagerCoursesPage | DialogHeader | generic | keep |
| ManagerCoursesPage | DialogTitle | generic | keep |
| ManagerCoursesPage | LabeledInputField | generic | keep |
| ManagerCoursesPage | LabeledSelectField | generic | keep |
| ManagerCoursesPage | ListItem | generic | keep |
| ManagerCoursesPage | LoadingText | generic | keep |
| ManagerCoursesPage | ManagerCoursesCardContent | domain specific | delete |
| ManagerCoursesPage | ManagerCoursesDetailsPanel | domain specific | keep |
| ManagerCoursesPage | ManagerCoursesDisclosure | domain specific | keep |
| ManagerCoursesPage | ManagerCoursesForm | domain specific | keep |
| ManagerCoursesPage | ManagerCoursesGrid | domain specific | keep |
| ManagerCoursesPage | MutedText | generic | keep |
| ManagerCoursesPage | SelectItem | generic | keep |
| ManagerCoursesPage | SimpleList | generic | keep |
| ManagerCoursesPage | TopSpacing | generic | keep |
| ManagerCoursesPage | TwoColumnFields | generic | keep |
| ManagerRequestsPage | Breadcrumb | generic | keep |
| ManagerRequestsPage | Button | generic | keep |
| ManagerRequestsPage | Card | generic | keep |
| ManagerRequestsPage | CardHeader | generic | keep |
| ManagerRequestsPage | CardTitle | generic | keep |
| ManagerRequestsPage | DefaultLayout | generic | keep |
| ManagerRequestsPage | EndActionsRow | generic | keep |
| ManagerRequestsPage | LabeledInputField | generic | keep |
| ManagerRequestsPage | ManagerRequestsFilterGroup | domain specific | consolidate → SchoolRequestsFilterGroup |
| ManagerRequestsPage | ManagerRequestsRejectionReasonField | domain specific | consolidate → SchoolRequestsRejectionReasonField |
| ManagerRequestsPage | ManagerRequestsSummaryColumn | domain specific | keep |
| ManagerRequestsPage | MutedText | generic | keep |
| ManagerRequestsPage | PrimaryText | generic | keep |
| ManagerRequestsPage | SmallText | generic | keep |
| ManagerRequestsPage | SpacedCardContent | generic | delete |
| ManagerRequestsPage | SummaryGrid | generic | keep |
| ManagerRequestsPage | TitledSection | generic | keep |
| ManagerSchoolPage | Breadcrumb | generic | keep |
| ManagerSchoolPage | DefaultLayout | generic | keep |
| ManagerSchoolPage | ManagerSchoolPageContent | domain specific | keep |
| ManagerSyllabusesPage | Breadcrumb | generic | keep |
| ManagerSyllabusesPage | DefaultLayout | generic | keep |
| ManagerSyllabusesPage | ManagerSyllabusesPageContent | domain specific | keep |
| NotFoundPage | NotFoundHeading | generic | keep |
| NotFoundPage | NotFoundHomeLink | generic | keep |
| NotFoundPage | NotFoundMessage | generic | keep |
| NotFoundPage | NotFoundPageCard | generic | keep |
| NotFoundPage | NotFoundPageContainer | generic | keep |
| PasswordReset | AuthInlineLink | generic | keep |
| PasswordReset | AuthPageLayout | generic | keep |
| RegistrationPage | Button | generic | keep |
| RegistrationPage | EmptyValue | generic | keep |
| RegistrationPage | EndAlignedActions | generic | keep |
| RegistrationPage | ExternalLinkText | generic | keep |
| RegistrationPage | Grid | generic | keep |
| RegistrationPage | InfoPanel | generic | keep |
| RegistrationPage | InlineLabel | generic | keep |
| RegistrationPage | LabeledInputField | generic | keep |
| RegistrationPage | LabeledSelectField | generic | keep |
| RegistrationPage | LabelValueParagraph | generic | keep |
| RegistrationPage | NoticeBox | generic | keep |
| RegistrationPage | PageContainer | generic | keep |
| RegistrationPage | Paragraph | generic | keep |
| RegistrationPage | RejectionReasonBlock | generic | keep |
| RegistrationPage | SchoolLogo | generic | keep |
| RegistrationPage | SchoolSelectOptionContent | generic | keep |
| RegistrationPage | SelectItem | generic | keep |
| RegistrationPage | Stack | generic | keep |
| RegistrationPage | SurfaceCard | generic | delete |
| RegistrationPage | SurfaceCardContent | generic | delete |
| RegistrationPage | SurfaceCardHeader | generic | keep |
| RegistrationPage | WebsiteList | generic | keep |
| RegistrationPage | WebsiteListItem | generic | keep |
| RequestPasswordReset | AuthInlineLink | generic | keep |
| RequestPasswordReset | AuthPageLayout | generic | keep |
| Signup | AuthInlineLink | generic | keep |
| Signup | AuthPageLayout | generic | keep |
| StudentCoursesPage | Breadcrumb | generic | keep |
| StudentCoursesPage | DefaultLayout | generic | keep |
| StudentCoursesPage | EmptyText | generic | keep |
| StudentCoursesPage | ListItem | generic | keep |
| StudentCoursesPage | LoadingText | generic | keep |
| StudentCoursesPage | PageRoot | generic | keep |
| StudentCoursesPage | SimpleList | generic | keep |
| StudentDashboardPage | CenteredPlaceholder | generic | keep |
| StudentDashboardPage | DefaultLayout | generic | keep |

## Notes

- HTML elements, hooks, utilities, Wasp operations, types, and local non-imported JSX helpers are excluded.
- The `Page` column uses the unique React page component name rather than duplicating rows for alias routes.
- `generic` = no domain coupling, reusable anywhere; `domain specific` = coupled to a feature domain.
- `keep` = cross-page, foundational, or legal HTML encapsulation; `delete` = thin ShadCN wrapper with no logic (remove export, use wrapped component directly in the patterns file); `promote` = single-page but worth generalizing.use justification; inline it.