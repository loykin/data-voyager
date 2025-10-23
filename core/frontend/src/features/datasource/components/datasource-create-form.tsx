"use client";

import React, { useState } from "react";
import { useCreate } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataSourceType, ConnectionConfig } from "../types/datasource.types";
import { useDatasources, useConnectionTest } from "../hooks/use-datasources";
import { Loader2, Check, X, TestTube } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(DataSourceType),
  description: z.string().optional(),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Valid port is required"),
  database: z.string().min(1, "Database is required"),
  username: z.string().optional(),
  password: z.string().optional(),
  isActive: z.boolean(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function DataSourceCreateForm() {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { createDataSource } = useDatasources();
  const { testConnection, testing } = useConnectionTest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: DataSourceType.PostgreSQL,
      description: "",
      host: "localhost",
      port: 5432,
      database: "",
      username: "",
      password: "",
      isActive: true,
      tags: "",
    },
  });

  const watchedType = form.watch("type");

  // Update default port when type changes
  React.useEffect(() => {
    const defaultPorts = {
      [DataSourceType.PostgreSQL]: 5432,
      [DataSourceType.ClickHouse]: 9000,
      [DataSourceType.SQLite]: 0,
      [DataSourceType.OpenSearch]: 9200,
    };
    form.setValue("port", defaultPorts[watchedType]);
  }, [watchedType, form]);

  const handleTestConnection = async () => {
    const values = form.getValues();
    const config: ConnectionConfig = {
      type: values.type,
      host: values.host,
      port: values.port,
      database: values.database,
      username: values.username,
      password: values.password,
    };

    setConnectionTestResult(null);

    try {
      const result = await testConnection(config);
      setConnectionTestResult({
        success: result.isConnected,
        message: result.message,
      });
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const tags = data.tags ? data.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [];

      await createDataSource({
        name: data.name,
        type: data.type,
        description: data.description,
        config: {
          type: data.type,
          host: data.host,
          port: data.port,
          database: data.database,
          username: data.username,
          password: data.password,
        },
        isActive: data.isActive,
        tags,
      });

      // Reset form or redirect
      form.reset();
      setConnectionTestResult(null);
    } catch (error) {
      console.error("Failed to create datasource:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Data Source</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Database" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a database type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={DataSourceType.PostgreSQL}>PostgreSQL</SelectItem>
                          <SelectItem value={DataSourceType.ClickHouse}>ClickHouse</SelectItem>
                          <SelectItem value={DataSourceType.SQLite}>SQLite</SelectItem>
                          <SelectItem value={DataSourceType.OpenSearch}>OpenSearch</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="database"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database</FormLabel>
                      <FormControl>
                        <Input placeholder="database_name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Optional password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="tag1, tag2, tag3" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated tags for organizing your data sources
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this data source for use
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {connectionTestResult && (
                <Alert className={connectionTestResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <div className="flex items-center gap-2">
                    {connectionTestResult.success ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={connectionTestResult.success ? "text-green-800" : "text-red-800"}>
                      {connectionTestResult.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>

              <Button type="submit">
                Create Data Source
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}