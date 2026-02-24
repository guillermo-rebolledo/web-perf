import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartBar,
  Eye,
  FileBraces,
  Lightbulb,
  Server,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceItem {
  type: "metric" | "audit" | "resource" | "insight";
  label: string;
  before: string | number;
  after: string | number;
  delta: string | number;
}

interface RootCause {
  id: string;
  title: string;
  description: string;
  confidence: number;
  estimatedImpact: number;
  evidence: EvidenceItem[];
  recommendations: string[];
}

interface RootCausePanelProps {
  causes: RootCause[];
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80)
    return "text-green-500 bg-green-50 border border-green-500";
  if (confidence >= 60)
    return "bg-yellow-500 bg-yellow-50 border border-yellow-500 text-yellow-800";
  return "bg-gray-400 bg-gray-50 border border-gray-400";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

function getCauseItemIcon(type: EvidenceItem["type"]): React.ReactNode {
  let icon = null;
  let wrapperClassName = "";

  switch (type) {
    case "metric":
      icon = <ChartBar className="size-4" />;
      wrapperClassName = "bg-blue-500/10 text-blue-500";
      break;
    case "audit":
      icon = <FileBraces className="size-4" />;
      wrapperClassName = "bg-amber-500/10 text-amber-500";
      break;
    case "resource":
      icon = <Server className="size-4" />;
      wrapperClassName = "bg-green-500/10 text-green-500";
      break;
    case "insight":
    default:
      icon = <Eye className="size-4" />;
      wrapperClassName = "bg-purple-500/10 text-purple-500";
      break;
  }
  return <span className={cn("p-1 rounded", wrapperClassName)}>{icon}</span>;
}

export function RootCausePanel({ causes }: RootCausePanelProps) {
  if (causes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No root causes identified. This may be due to insufficient historical
          data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {causes.map((cause, index) => (
        <Card
          key={cause.id}
          className={cn(
            "transition-all",
            index === 0 && "border-border shadow-md",
          )}
        >
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold bg-primary">
                    {index + 1}
                  </span>
                  <CardTitle className="tracking-tighter">
                    {cause.title}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cause.description}
                </p>
              </div>
              <div className="mt-3 flex flex-col items-start gap-2 md:mt-0 md:items-end">
                <div
                  className={cn(
                    "px-1 rounded-md text-[10px] font-bold uppercase w-fit select-none font-geist-mono",
                    getConfidenceColor(cause.confidence),
                  )}
                >
                  {getConfidenceLabel(cause.confidence)} Confidence (
                  {cause.confidence}%)
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>~{Math.round(cause.estimatedImpact)}ms impact</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Evidence Table */}
            {cause.evidence.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold tracking-tighter">
                  Evidence:
                </h4>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">
                          Metric/Resource
                        </TableHead>
                        <TableHead className="text-left">Before</TableHead>
                        <TableHead className="text-left">After</TableHead>
                        <TableHead className="text-left">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cause.evidence.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium flex items-center gap-2">
                            {getCauseItemIcon(item.type)} {item.label}
                          </TableCell>
                          <TableCell className="font-geist-mono text-xs">
                            {typeof item.before === "number"
                              ? item.before.toFixed(2)
                              : item.before}
                          </TableCell>
                          <TableCell className="font-geist-mono text-xs">
                            {typeof item.after === "number"
                              ? item.after.toFixed(2)
                              : item.after}
                          </TableCell>
                          <TableCell className="font-geist-mono text-xs font-semibold text-orange-600">
                            {item.delta}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {cause.recommendations.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold tracking-tighter">
                  Recommendations:
                </h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {cause.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-muted-foreground flex items-center gap-1"
                    >
                      <span className="text-primary">
                        <Lightbulb className="size-4" />
                      </span>
                      <span className="tracking-tighter">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
