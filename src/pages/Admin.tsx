import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Home, BarChart3, Settings } from "lucide-react";

export default function Admin() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, properties, and platform settings</p>
        </div>

        <Tabs defaultValue="pending-users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending-users" className="gap-2">
              <Users size={16} />
              Pending Users
            </TabsTrigger>
            <TabsTrigger value="pending-properties" className="gap-2">
              <Home size={16} />
              Pending Properties
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 size={16} />
              Platform Stats
            </TabsTrigger>
            <TabsTrigger value="all-users" className="gap-2">
              <Settings size={16} />
              All Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Professional Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon: User approval interface</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending-properties" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Property Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon: Property approval interface</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon: Statistics dashboard</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Coming soon: User management table</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
