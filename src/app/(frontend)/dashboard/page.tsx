import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@/payload.config'

import { ScoutDashboard } from '@/components/ScoutDashboard'

export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/login')
  }

  try {
    // Verify the user is authenticated
    const headers = new Headers()
    headers.set('authorization', `JWT ${token}`)
    const { user } = await payload.auth({ headers })

    if (!user || !user.roles?.includes('scout')) {
      redirect('/login')
    }

    // Find the scout record associated with this user
    const scout = await payload.find({
      collection: 'scouts',
      where: {
        user: {
          equals: user.id,
        },
      },
      limit: 1,
    })

    if (!scout.docs.length) {
      // Scout record not found - redirect to admin or show error
      redirect('/admin')
    }

    // Get the active campaign
    const activeCampaign = await payload.find({
      collection: 'campaigns',
      where: {
        active: {
          equals: true,
        },
      },
      limit: 1,
    })

    return (
      <ScoutDashboard
        scout={scout.docs[0]}
        campaign={activeCampaign.docs[0] || null}
        user={user}
      />
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    redirect('/admin/login')
  }
}
