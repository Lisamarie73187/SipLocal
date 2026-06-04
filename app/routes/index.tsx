import { createFileRoute } from '@tanstack/react-router'

import { DiscoveryView } from '@/components/DiscoveryView/DiscoveryView'

export const Route = createFileRoute('/')({
  ssr: false,
  component: HomePage,
})

function HomePage() {
  return <DiscoveryView />
}
