import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function AddProperty() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Submit Property Listing</h1>
          <p className="text-muted-foreground">Add a new property to the marketplace for admin review</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home size={20} />
              Property Submission Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon: Full property submission form with photo upload</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
