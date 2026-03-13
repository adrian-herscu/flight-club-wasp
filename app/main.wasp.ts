import { App } from 'wasp-config'

const app = new App('OpenSaaS', {
  wasp: {
    version: '^0.21.0',
  },

  title: 'My Open SaaS App',

  head: [
    "<link rel='icon' href='/favicon.ico' />",

    "<meta name='description' content='Your apps main description and features.' />",
    "<meta name='author' content='Your (App) Name' />",
    "<meta name='keywords' content='saas, solution, product, app, service' />",

    "<meta property='og:type' content='website' />",
    "<meta property='og:title' content='Your Open SaaS App' />",
    "<meta property='og:site_name' content='Your Open SaaS App' />",
    "<meta property='og:url' content='https://your-saas-app.com' />",
    "<meta property='og:description' content='Your apps main description and features.' />",
    "<meta property='og:image' content='https://your-saas-app.com/public-banner.webp' />",
    "<meta name='twitter:image' content='https://your-saas-app.com/public-banner.webp' />",
    "<meta name='twitter:image:width' content='800' />",
    "<meta name='twitter:image:height' content='400' />",
    "<meta name='twitter:card' content='summary_large_image' />",
    "<script defer data-domain='<your-site-id>' src='https://plausible.io/js/script.js'></script>", // for production
    "<script defer data-domain='<your-site-id>' src='https://plausible.io/js/script.local.js'></script>", // for development
  ],
})

const hasSendGridKey = (process.env.SENDGRID_API_KEY ?? '').trim().length > 0
const emailProvider: 'Dummy' | 'SendGrid' = hasSendGridKey ? 'SendGrid' : 'Dummy'

app.auth({
  userEntity: 'User',
  methods: {
    email: {
      userSignupFields: {
        import: 'getEmailUserFields',
        from: '@src/auth/userSignupFields',
      },
      fromField: {
        name: 'Flight Club',
        email: 'hello@flightclub.app',
      },
      emailVerification: {
        clientRoute: 'EmailVerificationRoute',
      },
      passwordReset: {
        clientRoute: 'PasswordResetRoute',
      },
    },
    google: {
      userSignupFields: {
        import: 'getGoogleUserFields',
        from: '@src/auth/userSignupFields',
      },
      configFn: {
        import: 'getGoogleAuthConfig',
        from: '@src/auth/userSignupFields',
      },
    },
  },
  onAuthFailedRedirectTo: '/login',
  onAuthSucceededRedirectTo: '/',
})

app.emailSender({
  provider: emailProvider,
})

app.db({
  seeds: [
    {
      import: 'seedMockUsers',
      from: '@src/server/scripts/dbSeeds',
    },
  ],
})

app.client({
  rootComponent: {
    importDefault: 'App',
    from: '@src/client/App',
  },
})

const landingPage = app.page('LandingPage', {
  component: { importDefault: 'LandingPage', from: '@src/landing-page/LandingPage' },
})
app.route('LandingPageRoute', { path: '/', to: landingPage })

//#region Auth Pages
const loginPage = app.page('LoginPage', {
  component: { importDefault: 'Login', from: '@src/auth/LoginPage' },
})
app.route('LoginRoute', { path: '/login', to: loginPage })

const signupPage = app.page('SignupPage', {
  component: { import: 'Signup', from: '@src/auth/SignupPage' },
})
app.route('SignupRoute', { path: '/signup', to: signupPage })

const emailVerificationPage = app.page('EmailVerificationPage', {
  component: {
    import: 'EmailVerification',
    from: '@src/auth/EmailVerificationPage',
  },
})
app.route('EmailVerificationRoute', {
  path: '/email-verification',
  to: emailVerificationPage,
})

const requestPasswordResetPage = app.page('RequestPasswordResetPage', {
  component: {
    import: 'RequestPasswordReset',
    from: '@src/auth/RequestPasswordResetPage',
  },
})
app.route('RequestPasswordResetRoute', {
  path: '/request-password-reset',
  to: requestPasswordResetPage,
})

const passwordResetPage = app.page('PasswordResetPage', {
  component: { import: 'PasswordReset', from: '@src/auth/PasswordResetPage' },
})
app.route('PasswordResetRoute', { path: '/password-reset', to: passwordResetPage })
//#endregion

//#region Registration
const registrationPage = app.page('RegistrationPage', {
  authRequired: true,
  component: {
    importDefault: 'RegistrationPage',
    from: '@src/registration/RegistrationPage',
  },
})
app.route('RegistrationRoute', { path: '/registration', to: registrationPage })

app.query('getMyRegistrationRequest', {
  fn: { import: 'getMyRegistrationRequest', from: '@src/registration/operations' },
  entities: ['User', 'School', 'RegistrationRequest'],
})

app.query('getRegistrationSchoolOptions', {
  fn: { import: 'getRegistrationSchoolOptions', from: '@src/registration/operations' },
  entities: ['School'],
})

app.action('submitRegistrationRequest', {
  fn: { import: 'submitRegistrationRequest', from: '@src/registration/operations' },
  entities: ['User', 'School', 'RegistrationRequest'],
})

const adminSchoolRequestsPage = app.page('AdminSchoolRequestsPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminSchoolRequestsPage',
    from: '@src/admin/dashboards/school-requests/SchoolRequestsDashboardPage',
  },
})
app.route('AdminSchoolRequestsRoute', {
  path: '/admin/school-requests',
  to: adminSchoolRequestsPage,
})

app.query('getPendingSchoolManagerRequests', {
  fn: {
    import: 'getPendingSchoolManagerRequests',
    from: '@src/registration/operations',
  },
  entities: ['User', 'School', 'RegistrationRequest'],
})

app.action('approveSchoolManagerRequest', {
  fn: { import: 'approveSchoolManagerRequest', from: '@src/registration/operations' },
  entities: ['User', 'School', 'RegistrationRequest', 'Account'],
})

app.action('rejectSchoolManagerRequest', {
  fn: { import: 'rejectSchoolManagerRequest', from: '@src/registration/operations' },
  entities: ['User', 'RegistrationRequest'],
})

const managerRequestsPage = app.page('ManagerRequestsPage', {
  authRequired: true,
  component: {
    importDefault: 'ManagerRequestsPage',
    from: '@src/school-manager/ManagerRequestsDashboardPage',
  },
})
app.route('ManagerRequestsRoute', {
  path: '/admin/member-requests',
  to: managerRequestsPage,
})

app.query('getPendingSchoolMemberRequests', {
  fn: {
    import: 'getPendingSchoolMemberRequests',
    from: '@src/registration/operations',
  },
  entities: ['User', 'School', 'RegistrationRequest'],
})

app.action('approveSchoolMemberRequest', {
  fn: { import: 'approveSchoolMemberRequest', from: '@src/registration/operations' },
  entities: ['User', 'School', 'RegistrationRequest', 'Instructor', 'Student', 'Account'],
})

app.action('rejectSchoolMemberRequest', {
  fn: { import: 'rejectSchoolMemberRequest', from: '@src/registration/operations' },
  entities: ['User', 'School', 'RegistrationRequest'],
})
//#endregion

//#region User
const accountPage = app.page('AccountPage', {
  authRequired: true,
  component: { importDefault: 'Account', from: '@src/user/AccountPage' },
})
app.route('AccountRoute', { path: '/account', to: accountPage })

app.query('getPaginatedUsers', {
  fn: { import: 'getPaginatedUsers', from: '@src/user/operations' },
  entities: ['User'],
})

app.action('updateIsUserAdminById', {
  fn: { import: 'updateIsUserAdminById', from: '@src/user/operations' },
  entities: ['User'],
})
//#endregion

//#region School Manager
const managerSchoolPage = app.page('ManagerSchoolPage', {
  authRequired: true,
  component: { importDefault: 'ManagerSchoolPage', from: '@src/school-manager/ManagerSchoolPage' },
})
app.route('ManagerSchoolRoute', { path: '/admin/school', to: managerSchoolPage })

const managerSyllabusesPage = app.page('ManagerSyllabusesPage', {
  authRequired: true,
  component: {
    importDefault: 'ManagerSyllabusesPage',
    from: '@src/school-manager/ManagerSyllabusesPage',
  },
})
app.route('ManagerSyllabusesRoute', {
  path: '/admin/syllabuses',
  to: managerSyllabusesPage,
})

app.query('getMyManagedSchool', {
  fn: { import: 'getMyManagedSchool', from: '@src/school-manager/operations' },
  entities: ['User', 'School', 'Account'],
})

app.query('getManagerSyllabusCatalog', {
  fn: { import: 'getManagerSyllabusCatalog', from: '@src/school-manager/operations' },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.query('getSyllabusVersionDetails', {
  fn: { import: 'getSyllabusVersionDetails', from: '@src/school-manager/operations' },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.action('createDraftSyllabusFromScratch', {
  fn: {
    import: 'createDraftSyllabusFromScratch',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.action('createDraftSyllabusFromTemplate', {
  fn: {
    import: 'createDraftSyllabusFromTemplate',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.action('saveDraftSyllabusRevision', {
  fn: { import: 'saveDraftSyllabusRevision', from: '@src/school-manager/operations' },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.action('publishDraftSyllabusVersion', {
  fn: {
    import: 'publishDraftSyllabusVersion',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson'],
})

app.action('createCourseFromFinalSyllabus', {
  fn: {
    import: 'createCourseFromFinalSyllabus',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Syllabus', 'SyllabusVersion', 'Course'],
})

app.query('getManagerCoursesForEnrollment', {
  fn: {
    import: 'getManagerCoursesForEnrollment',
    from: '@src/school-manager/operations',
  },
  entities: [
    'User',
    'School',
    'Syllabus',
    'SyllabusVersion',
    'Course',
    'EnrolledStudent',
  ],
})

app.query('getManagerStudentsForEnrollment', {
  fn: {
    import: 'getManagerStudentsForEnrollment',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Student', 'Account'],
})

app.query('getManagerCourseEnrollmentDetails', {
  fn: {
    import: 'getManagerCourseEnrollmentDetails',
    from: '@src/school-manager/operations',
  },
  entities: [
    'User',
    'School',
    'Syllabus',
    'SyllabusVersion',
    'Course',
    'Student',
    'EnrolledStudent',
  ],
})

app.query('getManagerInstructorsForAssignment', {
  fn: {
    import: 'getManagerInstructorsForAssignment',
    from: '@src/school-manager/operations',
  },
  entities: ['User', 'School', 'Instructor', 'Account'],
})

app.query('getManagerCourseInstructorDetails', {
  fn: {
    import: 'getManagerCourseInstructorDetails',
    from: '@src/school-manager/operations',
  },
  entities: [
    'User',
    'School',
    'Syllabus',
    'SyllabusVersion',
    'Course',
    'Instructor',
    'AssignedInstructor',
  ],
})

app.action('enrollStudentInCourse', {
  fn: { import: 'enrollStudentInCourse', from: '@src/school-manager/operations' },
  entities: [
    'User',
    'School',
    'Syllabus',
    'SyllabusVersion',
    'Course',
    'Student',
    'EnrolledStudent',
    'Account',
  ],
})

app.action('assignInstructorToCourse', {
  fn: {
    import: 'assignInstructorToCourse',
    from: '@src/school-manager/operations',
  },
  entities: [
    'User',
    'School',
    'Syllabus',
    'SyllabusVersion',
    'Course',
    'Instructor',
    'AssignedInstructor',
    'Account',
  ],
})

app.action('updateMyManagedSchool', {
  fn: {
    import: 'updateMyManagedSchool',
    from: '@src/school-manager/updateSchoolOperations',
  },
  entities: ['User', 'School', 'Account'],
})
//#endregion

//#region Admin Dashboard
const adminUsersPage = app.page('AdminUsersPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminUsers',
    from: '@src/admin/dashboards/users/UsersDashboardPage',
  },
})
app.route('AdminRoute', { path: '/admin', to: adminUsersPage })
app.route('AdminUsersRoute', { path: '/admin/users', to: adminUsersPage })

const adminSettingsPage = app.page('AdminSettingsPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminSettings',
    from: '@src/admin/elements/settings/SettingsPage',
  },
})
app.route('AdminSettingsRoute', { path: '/admin/settings', to: adminSettingsPage })

const adminCalendarPage = app.page('AdminCalendarPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminCalendar',
    from: '@src/admin/elements/calendar/CalendarPage',
  },
})
app.route('AdminCalendarRoute', { path: '/admin/calendar', to: adminCalendarPage })

const adminUiButtonsPage = app.page('AdminUIButtonsPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminUI',
    from: '@src/admin/elements/ui-elements/ButtonsPage',
  },
})
app.route('AdminUIButtonsRoute', {
  path: '/admin/ui/buttons',
  to: adminUiButtonsPage,
})

const notFoundPage = app.page('NotFoundPage', {
  component: {
    import: 'NotFoundPage',
    from: '@src/client/components/NotFoundPage',
  },
})
app.route('NotFoundRoute', { path: '*', to: notFoundPage })
//#endregion

//#region Contact Form Messages
const adminMessagesPage = app.page('AdminMessagesPage', {
  authRequired: true,
  component: {
    importDefault: 'AdminMessages',
    from: '@src/admin/dashboards/messages/MessagesPage',
  },
})
app.route('AdminMessagesRoute', { path: '/admin/messages', to: adminMessagesPage })
//#endregion

export default app
