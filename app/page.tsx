import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            OHiSee Control of Non-Conforming Products
          </h1>
          <p className="text-lg text-gray-600">
            BRCGS-certified non-conformance and maintenance management system
          </p>
        </div>

        {/* Design System Test Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Design System Verification</CardTitle>
            <CardDescription>Testing color palette and typography</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Swatches */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Color Palette</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div
                  className="h-24 bg-primary-600 rounded-md flex items-center justify-center"
                  data-testid="primary-color-test"
                >
                  <span className="text-white text-sm font-semibold">Primary</span>
                </div>
                <div className="h-24 bg-critical-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Critical</span>
                </div>
                <div className="h-24 bg-warning-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Warning</span>
                </div>
                <div className="h-24 bg-attention-500 rounded-md flex items-center justify-center">
                  <span className="text-attention-900 text-sm font-semibold">Attention</span>
                </div>
                <div className="h-24 bg-success-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Success</span>
                </div>
                <div className="h-24 bg-secondary-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Secondary</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Status Badges</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Open</Badge>
                <Badge variant="secondary">Draft</Badge>
                <Badge variant="destructive">Critical</Badge>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>

            {/* Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Primary Action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Delete</Button>
                <Button variant="outline">Cancel</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Typography (Poppins)</h3>
              <div className="space-y-2">
                <p className="text-3xl font-bold">Heading 1 - Page Title</p>
                <p className="text-2xl font-semibold">Heading 2 - Section</p>
                <p className="text-xl font-semibold">Heading 3 - Form Section</p>
                <p className="text-base">Body text - Standard content</p>
                <p className="text-sm">Small text - Helper text</p>
                <p className="text-xs">Caption - Timestamps</p>
              </div>
            </div>

            {/* Inter Font (Data) */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Data Typography (Inter)</h3>
              <div className="space-y-2">
                <p className="text-5xl font-bold font-alt">127</p>
                <p className="text-3xl font-semibold font-alt">3.14159</p>
                <p className="text-xl font-medium font-alt">NCA-2025-0847</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
