import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Non-Conformance Advice | OHiSee",
  description: "Create and manage Non-Conformance Advice forms",
};

export default function NCALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
