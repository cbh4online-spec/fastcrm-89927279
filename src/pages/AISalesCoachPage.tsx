import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AISalesCoachPage() {
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[50vh] p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>AI Sales Coach</CardTitle>
            <CardDescription>Módulo em desenvolvimento. Em breve poderá usar coaching de vendas com IA.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/dashboard/marketplace")}>
              Ver no Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
