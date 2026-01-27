import { ref } from 'vue'
import { appApi } from '@/api/app.api'
import { deploymentApi } from '@/api/deployment.api'
import { courseApi } from '@/api/course.api'

// ----------------------------------------------------------------
// USE DASHBOARD COMPOSABLE
// ----------------------------------------------------------------
export const useDashboard = () => {
  const stats = ref({
    deployments: 0,
    apps: 0,
    courses: 0,
    loading: true
  })

  const fetchStats = async () => {
    stats.value.loading = true

    try {
      const [deploymentsRes, coursesRes] = await Promise.all([
        appApi.list(),
        deploymentApi.list(),
        courseApi.list()
      ])

      const deploymentsData = deploymentsRes.data
      const coursesData = coursesRes.data

      // Berechne laufende Deployments
      const runningDeployments = deploymentsData.filter((d: any) => d.status === 'running')
      stats.value.deployments = runningDeployments.length

      // Berechne aktive Apps (mit laufenden Deployments)
      const appIdsWithRunningDeps = runningDeployments.map((d: any) => d.appId)
      const uniqueActiveAppIds = new Set(appIdsWithRunningDeps)
      stats.value.apps = uniqueActiveAppIds.size

      // Anzahl Kurse
      stats.value.courses = coursesData.length

    } catch (err) {
      console.error("Dashboard stats error:", err)
      throw err
    } finally {
      stats.value.loading = false
    }
  }

  return {
    stats,
    fetchStats
  }
}