import { ShowSchedule } from "./components/ShowSchedule";
import { LogisticsTravel } from "./components/LogisticsTravel";
import { DocumentsContacts } from "./components/DocumentsContacts";
import { PageHeader, PageHeaderMeta } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-background text-foreground py-8">
      <PageHeader
        title="Summer Music Festival"
        badge={
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Confirmed
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4" />
              Team (1)
            </Button>
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4" />
              Financials
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button size="sm">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </>
        }
      />
      
      <PageHeaderMeta
        className="mb-6"
        items={[
          {
            icon: <Calendar width={16} height={16} />,
            text: "Monday, July 15, 2024",
          },
          {
            icon: <Clock width={16} height={16} />,
            text: "20:00",
          },
          {
            icon: <MapPin width={16} height={16} />,
            text: "Madison Square Garden",
          },
        ]}
      />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ShowSchedule />
        <LogisticsTravel />
        <DocumentsContacts />
      </div>
    </div>
  );
}
