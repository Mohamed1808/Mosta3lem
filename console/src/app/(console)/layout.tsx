import { ReactNode } from "react";

import { Shell } from "@/components/shell";

/** Every signed-in console page sits inside the shell (menu, header, sign-in guard). */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
