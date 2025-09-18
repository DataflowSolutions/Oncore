import SupabaseStatus from "@/components/SupabaseStatus";

export default function Home() {
  return (
    // center it middle
    <div className="">
      <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <SupabaseStatus />
      </div>
    </div>
  );
}
