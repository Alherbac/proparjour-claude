import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { marketingFontVariables } from "@/components/marketing/fonts";
import { cn } from "@/lib/utils";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn(marketingFontVariables, "flex min-h-full flex-1 flex-col font-body-landing")}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
