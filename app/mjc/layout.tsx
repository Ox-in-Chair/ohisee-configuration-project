import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance Job Card | OHiSee",
  description: "Create and manage Maintenance Job Cards for equipment maintenance",
};

export default function MJCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
