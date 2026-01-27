export default {
  auth: {
    login: {
      title: "Login",
      emailLabel: "E-Mail",
      emailPlaceholder: "name@six7.de",
      userLabel: "Benutzername",
      userPlaceholder: "dein.username",
      passwordLabel: "Passwort",
      passwordPlaceholder: "••••••••",
      submit: "Login",
      keycloakButton: "Mit DHBW anmelden",
      keycloakInfo: "Melden Sie sich mit Ihrem DHBW-Account an",
      noAccount: "Kein Account? Wenden Sie sich an Ihren Administrator.",
      toRegister: "Noch kein Account? Registrieren",
      successMessage: "Erfolgreich angemeldet!",
      failureMessage: "Anmeldung fehlgeschlagen!",
      missingCredentials: "Bitte Nutzernamen und Passwort eingeben."
    },
    register: {
      title: "Registrierung",
      nameLabel: "Name",
      namePlaceholder: "Max Mustermann",
      emailLabel: "E-Mail",
      emailPlaceholder: "name@six7.de",
      passwordLabel: "Passwort",
      passwordPlaceholder: "••••••••",
      submit: "Registrieren",
      toLogin: "Zurück zum Login",
    },
  },

  nav: {
    dashboard: "Dashboard",
    deployments: "Deployments",
    courses: "Kurse",
    apps: "Apps",
    help: "Hilfe",
    config: "Konfiguration",
  },

  action: {
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    update: "Aktualisieren",
    create: "Erstellen",
    back: "Zurück",
  }, 

  ConfigView: {
    title: "Konfiguration",
    subtitle: "Verwalte hier die Anwendungseinstellungen",
  },

  CoursesView: {
    title: "Kurse",
    subtitle: "Verwalte hier deine Kurse",
    placeholder: "🚧 Platzhalter – Kursverwaltung folgt in Kürze",
  },

  DashboardView: {
    title: "Willkommen zurück zu Six7!",
    subtitle: "Hier ist eine Übersicht über Ihre Umgebung.",
    deployments: "Deployments",
    deploymentsRunning: "Laufende Deployments",
    deploymentsAll: "Alle Deployments",
    apps: "Apps",
    appsActive: "Aktive Apps",
    appsAll: "Alle Apps",
    courses: "Kurse",
    coursesActive: "Aktive Kurse",
    coursesAll: "Alle Kurse",
    activity: "Letzte Aktivitäten",
    appUpdated: "App aktualisiert",
    deploymentCreated: "Deployment erstellt",
    courseEdited: "Kurs bearbeitet",
    today: "Heute",
    yesterday: "Gestern",
    availableResources: "Verfügbare Ressourcen",
  },

  HelpView: {
    title: "Hilfe & Q/A",
    subtitle: "Unterstützung & häufige Fragen.",
  },

  DeploymentsView: {
    title: "Deployments",
    subtitle: "Übersicht über Ihre Deployments",
    newDeployment: "Neues Deployment",
    deploymentName: "Name",
    deploymentApp: "App",
    deploymentAppVersion: "App-Version",
    deploymentStatus: "Status",
    deploymentVM: "VMs",
    deploymentCourse: "Kurs",
    deploymentActivity: "Letzte Aktivität",
    deploymentsMissingMessage: "Keine Deployments gefunden.",
    deploymentSuccessful: "erfolgreich",
    deploymentFailed: "fehlgeschlagen",
    deploymentRunning: "läuft",
    deploymentStopped: "gestoppt",
    deploymentPending: "Ausstehend",
    deploymentCancelled: "abgebrochen",
  },
  DeploymentDetailView: {
    deploymentCreated: "Erstellt am",
    deploymentCreatedBy: "Erstellt von",
    deploymentDelete: "Deployment löschen",
    confirmDeleteTitle: "Löschen bestätigen",
   confirmDeleteMessage: "Möchten Sie das Deployment <strong>{name}</strong> wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.",
    confirmButton: "Löschen",
    cancelButton: "Abbrechen",
    deploymentSuccessToast: "Deployment erfolgreich gelöscht.",
    deploymentErrorToast: "Fehler beim Löschen des Deployments.",
    deploymentGroups: "Gruppen & VMs",
    deploymentNoGroups: "Keine Gruppen konfiguriert",
    deploymentStudentCount: "{n} Student | {n} Studenten",
    deploymentGroupsBack: "Zurück",
    deploymentConfig: "Deployment-Konfiguration",
    deploymentLatestTask: "Letzter Task",
    deploymentLogs: "Deployment Logs",
    deploymentNoLogs: "Keine Logs verfügbar.",
    deploymentWaitingOnLogs: "Warte auf Log-Stream...",
    deploymentLogsFailure: "Fehler"
  },
  DeploymentCreateView: {
    title: "Neues Deployment erstellen",
  },
  AppsView: {
    title: "Apps",
    subtitle: "Vorlagen zur Erstellung neuer Deployments.",
  },

  user: {
    title: "Profil",
    subtitle: "Persönliche Informationen & Kontoeinstellungen",

    name: "Prof. Dr. Eichberg",
    edit: "Profil bearbeiten",

    emailLabel: "E-Mail",
    emailValue: "eichberg@six7.de",

    roleLabel: "Rolle",
    roleAdmin: "Administrator",

    passwordLabel: "Passwort",
    changePassword: "Passwort ändern",
  },


  deployment: {
    title: 'Neues Deployment',
    subtitle: 'Wählen Sie eine App',
 
    actions: {
      back: 'Zurück',
      next: 'Weiter',
      deploy: 'Deployen'
    },
    apps: {
      nodejs: {
        title: 'NodeJS VM',
        description: 'Eine vorkonfigurierte NodeJS-Entwicklungsumgebung für Kurse und Übungen. Enthält NodeJS 20, NPM und Standard-Portfreigaben. Ideal für Webentwicklung im Unterricht.'
      },
      jupyter: {
        title: 'Jupyter Notebook',
        description: 'Server für Jupyter Notebooks mit Python, Pandas, NumPy und GPU-Unterstützung. Perfekt für KI-/Datenanalyse-Kurse.'
      },
      pentest: {
        title: 'Pentesting Lab',
        description: 'VMs für Penetration Testing. Enthält Angriffs- und Zielsysteme in isoliertem Netzwerk.'
      },
      gitlab: {
        title: 'GitLab Server',
        description: 'Vollständiger GitLab Server für Kursprojekte. Nutzer werden automatisch mit Gruppen-Accounts erstellt.'
      },
    },
    config: {
        nameLabel: 'Namen festlegen:',
        namePlaceholder: 'Pentesting-2025-bester-Kurs',
        courseLabel: 'Kurs auswählen',
        studentsLabel: 'Studenten auswählen',
        searchPlaceholder: 'Suche...',
        selectedCount: '{count} gewählt'
    },
    groups: {
      title: 'Legen Sie die Anzahl der Gruppen fest',
      one: 'Eine Gruppe',
      eachUser: 'Jeder Nutzer einzeln',  // <--- WICHTIG: Hier stand vorher "each", es muss "eachUser" heißen!
      custom: 'Individuell',
      autoAssigned: 'Automatisch zugewiesen',
      autoDistributed: 'Automatisch verteilt',
      studentsSelected: '{count} Studenten ausgewählt'
    },
    assignment: {
      title: 'Teilen Sie Nutzer zu',
      groupPrefix: 'Gruppe', // Wird zu "Gruppe 1", "Gruppe 2" etc.
      unassigned: 'Nicht zugewiesen', // Optional
      removeAll: 'Alle entfernen',
      moveAllHere: 'Alle hierhin verschieben',
      removeAllTooltip: 'Alle aus dieser Gruppe entfernen',
      moveAllTooltip: 'Verschiebt alle Studenten in diese Gruppe',
      vmNamePlaceholder: 'Team Name...',
      vmDefaultName: 'Team #{index}',
      defaultSingleName: 'Einzelteam', // Name für den Ein-Gruppen-Modus
      userCount: '{count} User',
      noStudents: 'Keine Studenten verfügbar.',
      alreadyAssigned: 'Bereits zugewiesen',
      inOtherGroup: 'In anderer Gruppe'
    },

    variables: {
      title: 'Nutzerspezifische Variablen',
      description: 'Optionale Parameter für das Deployment.',
      label: 'USER INPUT VAR' // Oder 'BENUTZER VARIABLEN', falls gewünscht
    },
    summary: {
      title: 'Empfohlene Konfiguration',
      labels: {
        flavor: 'Flavor',
        vms: 'VMs',
        image: 'Image',
        ports: 'Ports',
        network: 'Netzwerk',
        secGroup: 'Security Group',
        accounts: 'Accounts',
        storage: 'Storage',
        software: 'Software'
      },
      customize: 'Anpassen'
    },
    steps: {
      config: 'Auswahl',
      assignment: 'Verteilung',
      vars: 'Variablen',
      summary: 'Übersicht'
    },
    errors: {
      missingName: 'Bitte geben Sie einen Namen für das Deployment ein.',
      missingStudents: 'Bitte wählen Sie mindestens einen Studenten aus.'
    }
  },

};