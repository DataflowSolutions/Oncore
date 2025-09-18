import TabNavigation from "./components/TabNavigation";

export default function TourLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="max-w-[1440px] mx-auto px-1 md:px-8 lg:px-16 xl:px-24 pt-10 lg:flex justify-end mb-4 hidden">
        <TabNavigation />
      </div>
      {children}
    </div>
  );
}
