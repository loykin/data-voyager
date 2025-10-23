"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOne, useUpdate } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@data-voyager/shared-ui/components/ui/card";
import { Button } from "@data-voyager/shared-ui/components/ui/button";
import { Input } from "@data-voyager/shared-ui/components/ui/input";
import { Label } from "@data-voyager/shared-ui/components/ui/label";
import { Textarea } from "@data-voyager/shared-ui/components/ui/textarea";
import { Switch } from "@data-voyager/shared-ui/components/ui/switch";
import { useState, useEffect } from "react";
import type { DataSource } from "@/features/datasource/types/datasource.types";

export default function EditDataSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") || "";

  const { query } = useOne<DataSource>({
    resource: "datasources",
    id: id,
  });

  const { mutate: updateDataSource } = useUpdate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (query.data?.data) {
      setFormData({
        name: query.data.data.name,
        description: query.data.data.description || "",
        isActive: query.data.data.isActive,
      });
    }
  }, [query.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateDataSource(
      {
        resource: "datasources",
        id: id,
        values: formData,
      },
      {
        onSuccess: () => {
          router.push("/datasource");
        },
      }
    );
  };

  if (query.isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!query.data?.data) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-600">Datasource not found</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.push("/datasource")}>
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const datasource = query.data.data;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Data Source - {datasource.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={datasource.type}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-500">Type cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={query.isFetching}>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/datasource")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
