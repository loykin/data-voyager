"use client";

import React from "react";
import { useDatasources } from "@/features";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataSource, DataSourceType } from "@/features";
import { MoreHorizontal, Edit, Eye, Trash2, Plus } from "lucide-react";
import Link from "next/link";

export function DataSourceListShadcn() {
  const { datasources, loading, error } = useDatasources();

  const getTypeVariant = (type: DataSourceType) => {
    switch (type) {
      case DataSourceType.PostgreSQL:
        return "default";
      case DataSourceType.ClickHouse:
        return "secondary";
      case DataSourceType.SQLite:
        return "outline";
      case DataSourceType.OpenSearch:
        return "destructive";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading datasources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Error loading datasources: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-muted-foreground">
            Manage your database connections and data sources
          </p>
        </div>
        <Link href="/datasource/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Data Source
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources ({datasources?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasources?.map((datasource: DataSource) => (
                <TableRow key={datasource.id}>
                  <TableCell className="font-medium">{datasource.id}</TableCell>
                  <TableCell className="font-semibold">{datasource.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(datasource.type)}>
                      {datasource.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {datasource.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={datasource.isActive ? "default" : "secondary"}>
                      {datasource.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {datasource.tags?.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/datasource/show?id=${datasource.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/datasource/edit?id=${datasource.id}`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!datasources || datasources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data sources found. Create your first data source to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
