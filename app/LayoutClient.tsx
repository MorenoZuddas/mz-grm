'use client';

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Loader from "@/components/Loader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Mantiene l'ultima route "pronta": se cambia pathname, il loader resta visibile finche' non scade il timer.
  const [readyPathname, setReadyPathname] = useState<string | null>(null);
  const isLoading = readyPathname !== pathname;
  const isStorybookRoute = pathname.startsWith('/storybook');
  const footerClassName = pathname.startsWith('/exploration') ? '!mt-0' : '';

  useEffect(() => {
    const timer = setTimeout(() => setReadyPathname(pathname), 500);
    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <>
      {isLoading && <Loader />}
      {!isStorybookRoute && <Header />}
      {children}
      {!isStorybookRoute && <Footer className={footerClassName} />}
    </>
  );
}
