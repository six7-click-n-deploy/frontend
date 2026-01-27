// ================================================================
// Backend Model Types - Synced with FastAPI Backend
// ================================================================

// ----------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------
export type UserRole = 'student' | 'teacher' | 'admin'

export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed'

export type TaskType = 'deploy' | 'destroy' | 'update'

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed'

// ----------------------------------------------------------------
// USER TYPES
// ----------------------------------------------------------------
export interface User {
  userId: string
  email: string
  username: string
  role: UserRole
  courseId: string | null
  created_at: string
}

export interface UserWithCourse extends User {
  course: Course | null
}

export interface UserStatistics {
  total_apps: number
  total_deployments: number
  successful_deployments: number
  failed_deployments: number
  pending_deployments: number
}

export interface UserCreate {
  email: string
  password: string
  username: string
  role?: UserRole
  courseId?: string | null
}

export interface UserUpdate {
  email?: string
  username?: string
  role?: UserRole
  courseId?: string | null
}

export interface UserPasswordUpdate {
  current_password: string
  new_password: string
}

// ----------------------------------------------------------------
// COURSE TYPES
// ----------------------------------------------------------------
export interface Course {
  courseId: string
  name: string
  description: string
}

export interface CourseWithUsers extends Course {
  users: User[]
}

export interface CourseCreate {
  name: string
}

export interface CourseUpdate {
  name?: string
}

// ----------------------------------------------------------------
// APP TYPES
// ----------------------------------------------------------------
export interface App {
  appId: string
  name: string
  description: string | null
  git_link: string | null
  userId: string
  created_at: string
  releaseTag: string
}

export interface AppWithUser extends App {
  user: User
}

export interface AppCreate {
  name: string
  description?: string | null
  git_link?: string | null
  releaseTag?: string
}

export interface AppUpdate {
  name?: string
  description?: string | null
  git_link?: string | null
  image?: Blob | null
}

// ----------------------------------------------------------------
// DEPLOYMENT TYPES
// ----------------------------------------------------------------
export interface Deployment {
  deploymentId: string
  name: string
  appId: string
  userId: string
  status: DeploymentStatus
  commitHash: string | null
  commitInfo: string | null
  userInputVar: string | null
  releaseTag: string
  created_at: string
}

export interface DeploymentWithRelations extends Deployment {
  user: User
  app: App
  latest_task?: {
    taskId: string;
    type: string;
    status: string;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
  } | null;
  outputs?: any;
  logs?: string | null;
}

export interface DeploymentCreate {
  name: string
  appId: string
  commitHash?: string | null
  commitInfo?: string | null
  userInputVar?: Record<string, any> | null
  releaseTag: string
  teams?: Array<{ name: string; userIds: string[] }>
}

export interface DeploymentUpdate {
  name?: string
  status?: DeploymentStatus
  commitHash?: string | null
  commitInfo?: string | null
  userInputVar?: string | null
}

// ----------------------------------------------------------------
// TASK TYPES
// ----------------------------------------------------------------
export interface TaskLogEntry {
  timestamp: string
  level: string
  category?: string
  message: string
  [key: string]: any // Allow additional fields like operation, resource_type, etc.
}

export interface TaskLogsObject {
  error?: string
  deployment_id?: string
  logs?: TaskLogEntry[]
  tf_state?: any
  commit_info?: any
  terraform_outputs?: any
}

export interface Task {
  taskId: string
  deploymentId: string
  celeryTaskId: string
  type: TaskType
  status: TaskStatus
  started_at: string | null
  finished_at: string | null
  logs: string | TaskLogsObject | null
  tf_state: string | object | null
  outputs: string | object | null
  created_at: string
}

// ----------------------------------------------------------------
// USER GROUP TYPES
// ----------------------------------------------------------------
export interface UserGroup {
  userGroupId: string
  deploymentId: string
  courseIds?: string[]
}

export interface UserGroupWithMembers extends UserGroup {
  users: User[]
  courses: Course[]
}

export interface UserGroupCreate {
  deploymentId: string
  userIds?: string[]
  courseIds?: string[]
}

export interface UserGroupUpdate {
  deploymentId?: string
  userIds?: string[]
  courseIds?: string[]
}

// ----------------------------------------------------------------
// TEAM TYPES
// ----------------------------------------------------------------
export interface Team {
  teamId: string
  name: string
  userGroupId: string
}

export interface TeamWithMembers extends Team {
  users: User[]
}

export interface TeamCreate {
  name: string
  userGroupId: string
  userIds?: string[]
}

export interface TeamUpdate {
  name?: string
}

// ----------------------------------------------------------------
// AUTH TYPES
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// AUTH TYPES (moved to auth.api.ts)
// ----------------------------------------------------------------
// export interface LoginCredentials
// export interface RegisterData  
// export interface AuthToken
// These are now in auth.api.ts

// ----------------------------------------------------------------
// API RESPONSE TYPES
// ----------------------------------------------------------------
export interface ApiError {
  detail: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

// ----------------------------------------------------------------
// QUERY PARAMS
// ----------------------------------------------------------------
export interface PaginationParams {
  skip?: number
  limit?: number
}

export interface UserQueryParams extends PaginationParams {
  role?: UserRole
  courseId?: string
}

export interface AppQueryParams extends PaginationParams {
  userId?: string
}

export interface DeploymentQueryParams extends PaginationParams {
  userId?: string
  appId?: string
  status?: DeploymentStatus
}

export interface TeamQueryParams extends PaginationParams {
  userGroupId?: string
}


// ================================================================
// FRONTEND UI TYPES (Wizard State & Helper)
// ================================================================

// 1. Erweiterte App-Konfiguration für die UI (Summary View)
// Diese Daten kommen evtl. später hardcoded aus dem Frontend oder als JSON vom Backend
export interface AppUIConfig {
  flavor: string      // z.B. "m1.medium"
  image: string       // z.B. "kali:latest"
  ports: string       // z.B. "22, 8080"
  network: string     // z.B. "Isolated VLAN"
  software: string    // z.B. "Wireshark"
  secGroup?: string   // z.B. "SSH only"
  storage?: string    // z.B. "40 GB"
}

// Wir erweitern deinen Backend-App-Typ für die Nutzung im Store
export interface AppDefinition extends App {
  // Optional, da nicht jede App Configs haben muss oder diese erst gemockt werden
  defaultConfig?: AppUIConfig 
  // Icon Name als String für Lucide Icons (z.B. "Terminal", "ShieldAlert")
  iconStr?: string 
}

// 2. Wizard State (Der "Warenkorb" vor dem Absenden)
export type GroupMode = 'one' | 'eachUser' | 'custom'

export interface DeploymentDraft {
  // Schritt 1: App Auswahl
  appId: string | null
  
  // Schritt 2: Basis Konfiguration
  name: string
  courseIds: string[]    // Mehrere Kurse möglich
  studentIds: string[]   // Ausgewählte Studenten IDs
  
  // Schritt 3: Gruppen Anzahl
  groupMode: GroupMode
  groupCount: number,
  userInputVar: Record<string, any> | string // Kann Object oder JSON-String sein
  
  // Schritt 4: Zuweisung (Wer ist in welcher Gruppe?)
  // Key = Gruppen-Index (0, 1, 2...), Value = Array von UserIDs
  assignments: Record<number, string[]>
  releaseTag: string
          // Für den JSON-String aus dem Textfeld
  variables: Record<string, any> // Für die geparsten/gemergten Variablen
  version: string                // Optional, falls du es explizit brauchst
  groupNames: string[]
  variableDefinitions?: AppVariable[] // API-Definitionen für die Variablen
}

// 3. Helper Type für die finale Zusammenfassung
export interface WizardSummary {
  appName: string
  deploymentName: string
  totalStudents: number
  totalGroups: number
  config: AppUIConfig | undefined
}

export interface AppVariable {
  name: string
  type: string
  description?: string
  default?: any
  required?: boolean
  // ADD THIS PROPERTY:
  source?: 'terraform' | 'packer' | 'unknown' 
}