"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ShowDataSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") || "";

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Data Source Details {id ? `#${id}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">Detail view coming soon...</p>
          <Button onClick={() => router.push("/datasource")}>
            Back to List
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
