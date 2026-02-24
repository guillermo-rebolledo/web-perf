import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp } from "lucide-react";
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
  if (confidence >= 80) return "bg-green-500";
  if (confidence >= 60) return "bg-yellow-500";
  return "bg-gray-400";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

export function RootCausePanel({ causes }: RootCausePanelProps) {
  if (causes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No root causes identified. This may be due to insufficient historical data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {causes.slice(0, 3).map((cause, index) => (
        <Card key={cause.id} className={cn(
          "transition-all",
          index === 0 && "border-primary/50 shadow-md"
        )}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold",
                    index === 0 && "bg-primary",
                    index === 1 && "bg-blue-500",
                    index === 2 && "bg-slate-500"
                  )}>
                    {index + 1}
                  </span>
                  <CardTitle className="text-base">{cause.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cause.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-semibold text-white",
                    getConfidenceColor(cause.confidence)
                  )}>
                    {getConfidenceLabel(cause.confidence)} ({cause.confidence}%)
                  </div>
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
              <div>
                <h4 className="text-sm font-semibold mb-2">Evidence:</h4>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Metric/Resource</th>
                        <th className="text-left p-2 font-medium">Before</th>
                        <th className="text-left p-2 font-medium">After</th>
                        <th className="text-left p-2 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cause.evidence.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-medium">{item.label}</td>
                          <td className="p-2 font-mono text-xs">{item.before}</td>
                          <td className="p-2 font-mono text-xs">{item.after}</td>
                          <td className="p-2 font-mono text-xs font-semibold text-orange-600">
                            {item.delta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {cause.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Recommendations:
                </h4>
                <ul className="space-y-1.5">
                  {cause.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
