"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/explorer");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div>Loading...</div>
    </div>
  );
}
