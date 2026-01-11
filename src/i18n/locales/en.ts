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
    subtitle: "Manage your courses here",
    placeholder: "🚧 Placeholder – Course management coming soon",
  },

  DashboardView: {
    title: "Welcome back to Six7!",
    subtitle: "Here is an overview of your workspace",
    deployments: "Deployments",
    deploymentsRunning: "Running Deployments",
    deploymentsAll: "All Deployments",
    apps: "Apps",
    appsAll: "All Apps",
    appsActive: "Active Apps",
    courses: "Courses",
    coursesActive: "Active Courses",
    coursesAll: "All Courses",
    activity: "Recent Activity",
    appUpdated: "App updated",
    deploymentCreated: "Deployment created",
    courseEdited: "Course edited",
    today: "Today",
    yesterday: "Yesterday",
  },

  HelpView: {
    title: "Help & Q/A",
    subtitle: "Support & frequently asked questions.",
  },

  DeploymentsView: {
    title: "Deployments",
    subtitle: "Overview of your deployments.",
    newDeployment: "New Deployment",
    deploymentName: "Name",
    deploymentApp: "App",
    deploymentAppVersion: "App Version",
    deploymentStatus: "Status",
    deploymentVM: "VMs",
    deploymentCourse: "Course",
    deploymentActivity: "Last Activity",
    deploymentMessage: "No deployments found."
  },
  DeploymentDetailView: {
    deploymentCreated: "Created on",
    deploymentDelete: "Delete Deployment",
    confirmDeleteTitle: "Confirm Deletion",
    confirmDeleteMessage: "Are you sure you want to delete the deployment <strong>{name}</strong>? This action cannot be undone.",
    cancelButton: "Cancel",
    confirmButton: "Delete",
    deploymentSuccessToast: "Deployment deleted successfully.",
    deploymentErrorToast: "Error deleting deployment.",
  },
  DeploymentCreateView:{
    title: "Create New Deployment",
  },
  AppsView: {
    title: "Apps",
    subtitle: "Templates for creating new deployments.",
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
        searchPlaceholder: 'Search...'
    },
    groups: {
      title: 'Set the number of groups',
      one: 'One group',
      eachUser: 'Each user individually', // <--- WICHTIG: "eachUser" statt "each"
      custom: 'Custom'
    },
    assignment: {
      title: 'Assign users to groups',
      groupPrefix: 'Group', // Wird zu "Group 1", "Group 2" etc.
      unassigned: 'Unassigned' // Optional
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
  },



};