import { AppLayout } from "@/components/layout";

export default function DatasourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
