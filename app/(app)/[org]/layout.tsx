import TabNavigation from "./components/TabNavigation";

export default function TourLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="pt-10 lg:flex justify-end mb-4 hidden">
        <TabNavigation />
      </div>
      {children}
    </div>
  );
}
