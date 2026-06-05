export default {
  auth: {
    login: {
      title: "Login",
      emailLabel: "E-Mail",
      emailPlaceholder: "name@six7.de",
      userLabel: "Username",
      userPlaceholder: "your.username",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Login",
      keycloakButton: "Sign in with DHBW",
      keycloakInfo: "Sign in with your DHBW account",
      noAccount: "No account? Contact your administrator.",
      toRegister: "No account yet? Register",
      successMessage: "Successfully logged in!",
      failureMessage: "Login failed!",
      missingCredentials: "Please enter username and password."
    },
    register: {
      title: "Register",
      nameLabel: "Name",
      namePlaceholder: "John Doe",
      emailLabel: "E-Mail",
      emailPlaceholder: "name@six7.de",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Register",
      toLogin: "Back to login",
    },
  },

  nav: {
    dashboard: "Dashboard",
    deployments: "Deployments",
    courses: "Courses",
    apps: "Apps",
    help: "Help",
    config: "Configuration",
  },

  action: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    update: "Update",
    create: "Create",
    back: "Back",
  },

  ConfigView: {
    title: "Configuration",
    subtitle: "Manage your application settings",
  },

  CoursesView: {
    title: "Courses",
    subtitle: "Manage your courses and participants",
    newCourse: "New Course",
    loading: "Loading courses...",
    noCourses: "No courses available yet",
    createFirst: "Create first course",
    memberSingular: "Member",
    memberPlural: "Members",
    deleteTitle: "Delete",
    createModal: {
      title: "New Course",
      nameLabel: "Course Name *",
      namePlaceholder: "e.g. CS101",
      cancel: "Cancel",
      create: "Create"
    },
    deleteModal: {
      title: "Delete Course",
      confirmPrompt: "Are you sure you want to delete the course <strong>{name}</strong>?",
      warning: "Memberships will be removed, but user accounts will remain.",
      cancel: "Cancel",
      deleting: "Deleting...",
      delete: "Delete"
    },
    toasts: {
      loadError: "Failed to load courses",
      createSuccess: "Course created!",
      createError: "Failed to create course",
      deleteSuccess: "Course deleted!",
      deleteError: "Failed to delete course"
    }
  },

  DashboardView: {
    title: "Welcome back to Six7!",
    subtitle: "Here is an overview of your workspace.",
    deployments: "Deployments",
    deploymentsRunning: "Running Deployments",
    deploymentsAll: "All Deployments",
    apps: "Apps",
    appsAll: "All Apps",
    appsActive: "Apps total",
    courses: "Courses",
    coursesActive: "Courses total",
    coursesAll: "All Courses",
    activity: "Recent Activity",
    appUpdated: "App updated",
    deploymentCreated: "Deployment created",
    courseEdited: "Course edited",
    today: "Today",
    yesterday: "Yesterday",
    availableResources: "Available Resources",
  },

  HelpView: {
    title: "Help & Q/A",
    subtitle: "Support & frequently asked questions.",
    quickTip: "Only for logged-in users: direct help for the app’s core workflows.",
    intro: "This page explains the most important steps for users who are already signed in. You get concrete guidance for deployments, quotas and next practical steps.",
    loggedInUsers: {
      title: "Who is this page for?",
      description: "This page is explicitly for logged-in users. You already have access and are looking for clear answers instead of generic onboarding text.",
    },
    quota: {
      title: "What are quotas?",
      description: "Quotas set limits for your resources. They determine, for example, how many deployments or apps you can use or manage at the same time.",
      item1: "Maximum number of simultaneous deployments",
      item2: "Caps for apps, teams, and resource consumption",
      item3: "A safeguard against overload",
    },
    quickHelp: {
      title: "Step-by-step guide",
      processTitle: "Deployment process",
      step1: "Open the deployments overview and start a new deployment.",
      step2: "Choose the desired app and app version.",
      step3: "Assign the deployment to a course or team and adjust the settings.",
      step4: "Check team permissions to ensure the right users have access.",
      step5: "Review your current quotas before launching the deployment.",
      step6: "Start the deployment and monitor status and logs in the detail view.",
      pagesTitle: "What you can do on each main page",
      pageDashboardTitle: "Dashboard",
      pageDashboard: "Quickly see active deployments, system health, and available resources.",
      pageAppsTitle: "Apps",
      pageApps: "Verify the app you need or add new applications and versions.",
      pageCoursesTitle: "Courses",
      pageCourses: "Link deployments to courses and organize participant groups.",
      pageTeamsTitle: "Teams",
      pageTeams: "Manage roles, access, and team membership.",
      pageDeploymentsTitle: "Deployments",
      pageDeployments: "Create deployments, check status, and investigate errors.",
      pageQuotasTitle: "Quotas",
      pageQuotas: "See your limits and check whether new deployments are allowed.",
    },
    troubleshooting: {
      title: "If something does not work",
      description: "This checklist helps you find the most common blockers quickly and understand what to check next.",
      item1: "Check whether you have reached your quota limit.",
      item2: "Confirm you have the correct permissions.",
      item3: "Look at deployment details and logs to narrow down the issue.",
    },
    faq: {
      title: "Frequently asked questions",
      question1: "I opened the help page – do I already have an account?",
      answer1: "Yes. This page is for users who are already logged in. Without an account you would not be able to reach it.",
      question2: "Why can't I start a deployment?",
      answer2: "This is usually caused by quota limits, missing permissions, or the selected app not being available. Check these three points first.",
      question3: "Where can I find more details about errors?",
      answer3: "Open the deployment details and read the logs and status messages. They usually contain the most important clues.",
    },
  },

  DeploymentsView: {
    title: "Deployments",
    subtitle: "Overview of your deployments",
    newDeployment: "New Deployment",
    checkingStatus: "Checking status...",
    deploymentName: "Name",
    deploymentApp: "App",
    deploymentAppVersion: "App Version",
    deploymentStatus: "Status",
    deploymentVM: "VMs",
    deploymentCourse: "Course",
    deploymentActivity: "Last Activity",
    deploymentsMissingMessage: "No deployments found.",
    deploymentSuccessful: "successful",
    deploymentFailed: "failed",
    deploymentRunning: "running",
    deploymentStopped: "stopped",
    deploymentPending: "pending",
    deploymentCancelled: "cancelled",
    deploymentCreatedAt: "Created at",
    deploymentDestroyed: "destroyed",
    deploymentDestroying: "destroying",
  },
  DeploymentDetailView: {
    deploymentCreated: "Created on",
    deploymentCreatedBy: "Created by",
    deploymentDelete: "Delete",
    confirmDeleteTitle: "Delete deployment",
    confirmDeleteMessage: "Delete deployment <strong>{name}</strong>? If OpenStack resources still exist they will be torn down via Terraform first (live progress below).",
    cancelButton: "Cancel",
    confirmButton: "Delete",
    deleteStartedToast: "Deleting — see live progress below.",
    deleteSuccessToast: "Deployment deleted.",
    deleteErrorToast: "Error deleting deployment.",
    deploymentGroups: "Groups & VMs",
    deploymentNoGroups: "No groups configured",
    deploymentLatestTask: "Latest Task",
    deploymentGroupsBack: "Back",
    deploymentStudentCount: "{n} Student | {n} Students",
    deploymentConfig: "Deployment Configuration",
    deploymentLogs: "Deployment Logs",
     deploymentNoLogs: "No Logs available.",
    deploymentWaitingOnLogs: "Waiting for log stream...",
    deploymentLogsFailure: "Failure",
    teamsAndMembers: "Teams & Members",
    tasksAndLogs: "Tasks & Logs",
    tasksOwnerOnly: "Tasks and logs are only visible to the deployment owner and to teaching staff.",
    resendAccessButton: "Resend access",
    resendAccessSending: "Sending...",
    resendAccessSent: "Sent",
    resendAccessRetry: "Retry",
    resendAccessTooltip: "Re-send the access-credentials mail to this user",
    resendAccessSuccess: "Access mail sent.",
    resendAccessError: "Failed to send access mail",
    cancelDeployment: "Cancel Deployment",
    confirmCancelTitle: "Confirm Cancel",
    confirmCancelMessage: "Are you sure you want to cancel the deployment <strong>{name}</strong>? The running process will be stopped.",
    confirmCancelButton: "Stop",
    cancelSuccessToast: "Deployment cancelled successfully.",
    cancelErrorToast: "Error cancelling deployment.",
    destroyDeployment: "Destroy & Remove",
    confirmDestroyTitle: "Confirm Destroy & Remove",
    confirmDestroyMessage: "Are you sure you want to tear down all OpenStack resources for deployment <strong>{name}</strong>? It will then be removed from your list. This cannot be undone.",
    confirmDestroyButton: "Destroy & Remove",
    destroyStartedToast: "Destroy started — see live progress below.",
    destroySuccessToast: "Deployment destroyed and removed.",
    destroyErrorToast: "Error starting destroy.",
  },
  DeploymentCreateView:{
    title: "Create New Deployment",
  },
  AppsView: {
    title: "Apps",
    subtitle: "Templates for creating new deployments.",
    addApp: "Add App",
    loading: "Loading data...",
    noAppsTitle: "No apps available",
    noAppsDesc: "No apps have been created in the database yet.",
    noDescription: "No description available.",
    detailsDeploy: "Details & Deployment",
    loadError: "Failed to load apps.",
  },
  AppsCreateView: {
    title: "Add App",
    form: {
      nameLabel: "App Name:",
      namePlaceholder: "Name",
      descLabel: "App Description:",
      descPlaceholder: "This is a sample text",
      logoLabel: "App Logo (Optional):",
      logoSelect: "Select image or drag and drop here",
      logoRemove: "Remove",
      repoLabel: "Link to GitHub Repo:",
      repoPlaceholder: "https://github.com..."
    },
    preview: {
      badge: "Preview",
      logoAlt: "App Preview Logo",
      defaultName: "Name",
      defaultDesc: "This is a sample text",
      deployBtn: "Deploy Now"
    },
    info: {
      important: "Important:",
      inviteText: "Please invite the git user <strong>six7clickndeploy</strong> as a collaborator to the repo."
    },
    buttons: {
      saving: "Saving...",
      add: "Add"
    },
    messages: {
      onlyImages: "Please upload image files only.",
      imageTooLarge: "Image too large (max. {size} MB).",
      missingFields: "Please provide a name and a repo URL.",
      invalidUrl: "This does not look like a valid Git URL (e.g., https://github.com/user/repo).",
      success: "App successfully created!",
      noAccess: "Invalid URL or no access to the repository. Please check permissions.",
      serverError: "Server Error: {statusText}",
      networkError: "Error creating the app. (Network error)"
    }
  },
  AppsDetailView: {
    deleteApp: "Delete",
    confirmDeleteTitle: "Delete app",
    confirmDeleteMessage: "Delete app <strong>{name}</strong>? Existing deployments of this app keep working; no new deployments can be started afterwards. The DB row stays for audit.",
    confirmButton: "Delete",
    cancelButton: "Cancel",
    deletingButton: "Deleting...",
    deleteSuccessToast: "App deleted.",
    deleteErrorToast: "Failed to delete app",
    loading: "Loading App Details...",
    backToOverview: "Back to overview",
    versionsAvailable: "versions available",
    descriptionTitle: "Description",
    noDescription: "No detailed description available for this app.",
    appInfoTitle: "App Information",
    createdAt: "Created at:",
    createdBy: "Created by:",
    unknownUser: "Unknown",
    versionDetailsTitle: "Version Details",
    versionName: "Name:",
    versionType: "Type:",
    versionCommit: "Commit:",
    versionAuthor: "Author:",
    versionPublishedAt: "Published at:",
    versionPreRelease: "Pre-Release:",
    versionLink: "Link:",
    yes: "Yes",
    no: "No",
    noVersionInfo: "No further information on this version.",
    versionDescTitle: "Version Description",
    startDeploymentTitle: "Start Deployment",
    selectVersionLabel: "Select Version",
    deployButton: "Deploy Now",
    missingCredsTitle: "OpenStack credentials missing — see profile",
    missingCredsLink: "OpenStack Credentials",
    missingCredsText: "must be provided to deploy this app.",
    toasts: {
      loadError: "Failed to load app details.",
      selectVersionFirst: "Please select a version first.",
      preparingConfig: "Preparing configuration for {name}."
    }
  },
  user: {
    title: "User Profile",
    subtitle: "Personal information & account settings",

    name: "Prof. Dr. Eichberg",
    edit: "Edit Profile",

    emailLabel: "E-Mail",
    emailValue: "eichberg@six7.de",

    roleLabel: "Role",
    roleAdmin: "Administrator",

    passwordLabel: "Password",
    changePassword: "Change Password",
  },

  deployment: {
    title: 'New Deployment',
    subtitle: 'Choose an app to deploy',

    actions: {
      back: 'Back',
      next: 'Next',
      deploy: 'Deploy'
    },
    apps: {
      nodejs: {
        title: 'NodeJS VM',
        description: 'A preconfigured NodeJS development environment for courses and exercises. Contains NodeJS 20, NPM and standard port mappings. Ideal for web development in the classroom.'
      },
      jupyter: {
        title: 'Jupyter Notebook',
        description: 'Server for Jupyter Notebooks with Python, Pandas, NumPy and GPU support. Perfect for AI/Data analysis courses.'
      },
      pentest: {
        title: 'Pentesting Lab',
        description: 'VMs for Penetration Testing. Contains attack and target systems in an isolated network.'
      },
      gitlab: {
        title: 'GitLab Server',
        description: 'Complete GitLab Server for course projects. Users are automatically created with group accounts.'
      }
    },
    config: {
        nameLabel: 'Select a name:',
        namePlaceholder: 'Pentesting-2025-best-course',
        courseLabel: 'Select a course',
        studentsLabel: 'Select students',
        searchPlaceholder: 'Search...',
        selectedCount: '{count} selected'
    },
    groups: {
      title: 'Set the number of groups',
      one: 'One group',
      eachUser: 'Each user individually', // <--- WICHTIG: "eachUser" statt "each"
      custom: 'Custom',
      autoAssigned: 'Assigned automatically',
      autoDistributed: 'Distributed automatically',
      studentsSelected: '{count} students selected'
    },
    assignment: {
      title: 'Assign users to groups',
      groupPrefix: 'Group', // Wird zu "Group 1", "Group 2" etc.
      unassigned: 'Unassigned', // Optional
      removeAll: 'Remove all',
      moveAllHere: 'Move all here',
      removeAllTooltip: 'Remove all students from this group',
      moveAllTooltip: 'Moves all students to this group',
      vmNamePlaceholder: 'Team Name...',
      vmDefaultName: 'Team #{index}',
      defaultSingleName: 'Single Team',
      userCount: '{count} Users',
      noStudents: 'No students available.',
      alreadyAssigned: 'Already assigned',
      inOtherGroup: 'In another group'
    },

    variables: {
      title: 'User-specific Variables',
      description: 'Optional parameters for the deployment.',
      label: 'USER INPUT VAR'
    },
    summary: {
      title: 'Recommended Configuration',
      labels: {
        flavor: 'Flavor',
        vms: 'VMs',
        image: 'Image',
        ports: 'Ports',
        network: 'Network',
        secGroup: 'Security Group',
        accounts: 'Accounts',
        storage: 'Storage',
        software: 'Software'
      },
      customize: 'Customize'
    },
    steps: {
      config: 'Selection',
      assignment: 'Distribution',
      vars: 'Variables',
      summary: 'Overview'
    },

    errors: {
      missingName: 'Please enter a name for the deployment.',
      missingStudents: 'Please select at least one student.'
    }
  },



};