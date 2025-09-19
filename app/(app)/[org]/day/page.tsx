import { ShowSchedule } from "./components/ShowSchedule";
import { LogisticsTravel } from "./components/LogisticsTravel";
import { DocumentsContacts } from "./components/DocumentsContacts";
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  DollarSign,
  Download,
  Share2,
} from "lucide-react";

export default function DayPage() {
  return (
    <div className="min-h-screen bg-background text-foreground  py-8">
      <div className="lg:mb-8 mb-4 gap-4 flex-col lg:flex-row flex justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Summer Music Festival</h1>
          <div className="flex items-center gap-4 text-sm text-foreground/70 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar width={16} height={16} /> Monday, July 15, 2024
            </span>
            <span className="flex items-center gap-1">
              <Clock width={16} height={16} /> 20:00
            </span>
            <span className="flex items-center gap-1">
              <MapPin width={16} height={16} /> Madison Square Garden
            </span>
            <span className="bg-green-700 text-white px-2 py-0.5 rounded text-xs">
              confirmed
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex gap-2 flex-wrap">
            <button className="bg-card rounded text-xs font-medium inline-flex items-center justify-center gap-2 px-4 py-2 cursor-pointer hover:scale-[1.05] transition hover:bg-foreground/10">
              <Users className="w-4 h-4" /> Team (1)
            </button>
            <button className="bg-card rounded text-xs font-medium inline-flex items-center justify-center gap-2 px-4 py-2 cursor-pointer hover:scale-[1.05] transition hover:bg-foreground/10">
              <DollarSign className="w-4 h-4" /> Financials
            </button>
            <button className="bg-card rounded text-xs font-medium inline-flex items-center justify-center gap-2 px-4 py-2 cursor-pointer hover:scale-[1.05] transition hover:bg-foreground/10">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button className="bg-foreground px-4 rounded text-xs text-background font-medium inline-flex items-center justify-center gap-2 py-2 cursor-pointer hover:scale-[1.05] transition hover:bg-foreground/90">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row xl:justify-between gap-6">
        <ShowSchedule />
        <LogisticsTravel />
        <DocumentsContacts />
      </div>
    </div>
  );
}
