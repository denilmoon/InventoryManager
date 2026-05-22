import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ecowater Inventory Manager</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Shadcn and Tailwind are working correctly.
          </p>
          <div className="flex gap-2">
            <Badge variant="default">TIER 1</Badge>
            <Badge variant="secondary">TIER 2</Badge>
            <Badge variant="destructive">LOW STOCK</Badge>
          </div>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App