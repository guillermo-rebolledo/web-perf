import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import type { UserDigestData, SiteDigest } from "@/lib/digest/aggregator";
import { format } from "date-fns";

interface WeeklyDigestEmailProps {
  data: UserDigestData;
  unsubscribeUrl: string;
  appUrl: string;
}

// ── Design tokens (inline — React Email renders in email clients, no CSS vars) ──
const NAVY = "#0f172a";
const ORANGE = "#f97316";
const ORANGE_DARK = "#ea6c00";
const CARD_BG = "#1e293b";
const SCORE_BG = "#0d1a2e";
const MUTED = "#94a3b8";
const TEXT = "#e2e8f0";
const TEXT_DIM = "#cbd5e1";
const BORDER = "#334155";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#eab308";

// ── Score quality thresholds (matches Lighthouse) ───────────────────────────
function scoreColor(value: number | null): string {
  if (value === null) return MUTED;
  if (value >= 90) return GREEN;
  if (value >= 50) return YELLOW;
  return RED;
}

const trendArrow = (trend: SiteDigest["trend"]) => {
  if (trend === "improving") return "▲";
  if (trend === "declining") return "▼";
  return "→";
};

const trendColor = (trend: SiteDigest["trend"]) => {
  if (trend === "improving") return GREEN;
  if (trend === "declining") return RED;
  return MUTED;
};

const severityDot = (sev: "critical" | "moderate" | "minor") => {
  const colors = { critical: RED, moderate: YELLOW, minor: MUTED };
  return colors[sev];
};

const fmtScore = (v: number | null) =>
  v !== null ? Math.round(v).toString() : "—";

const fmtLcp = (v: number | null) =>
  v !== null ? `${(v / 1000).toFixed(1)}s` : "—";

const fmtCls = (v: number | null) =>
  v !== null ? v.toFixed(3) : "—";

const fmtInp = (v: number | null) =>
  v !== null ? `${Math.round(v)}ms` : "—";

export function WeeklyDigestEmail({
  data,
  unsubscribeUrl,
  appUrl,
}: WeeklyDigestEmailProps) {
  const { weekRange, sites, summary } = data;
  const weekLabel = `${format(weekRange.start, "MMM d")} – ${format(weekRange.end, "MMM d, yyyy")}`;
  const previewText =
    summary.totalCriticalAlerts > 0
      ? `${summary.totalCriticalAlerts} critical alert${summary.totalCriticalAlerts > 1 ? "s" : ""} across your monitored sites`
      : summary.sitesDeclining > 0
        ? `${summary.sitesDeclining} site${summary.sitesDeclining > 1 ? "s" : ""} declining — check your performance summary`
        : `Your sites are looking ${summary.sitesImproving > 0 ? "good" : "stable"} this week`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.logo}>PerfLabs</Text>
            <Text style={styles.headerSub}>Weekly Performance Digest</Text>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
          </Section>

          {/* Summary row */}
          <Section style={styles.summarySection}>
            <Row>
              <Column style={styles.summaryCell}>
                <Text style={styles.summaryNum}>{summary.totalSites}</Text>
                <Text style={styles.summaryLabel}>Sites</Text>
              </Column>
              <Column style={styles.summaryCell}>
                <Text style={{ ...styles.summaryNum, color: summary.totalCriticalAlerts > 0 ? RED : MUTED }}>
                  {summary.totalCriticalAlerts}
                </Text>
                <Text style={styles.summaryLabel}>Critical Alerts</Text>
              </Column>
              <Column style={styles.summaryCell}>
                <Text style={{ ...styles.summaryNum, color: summary.sitesImproving > 0 ? GREEN : MUTED }}>
                  {summary.sitesImproving}
                </Text>
                <Text style={styles.summaryLabel}>Improving</Text>
              </Column>
              <Column style={styles.summaryCell}>
                <Text style={{ ...styles.summaryNum, color: summary.sitesDeclining > 0 ? RED : MUTED }}>
                  {summary.sitesDeclining}
                </Text>
                <Text style={styles.summaryLabel}>Declining</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={styles.divider} />

          {/* Per-site sections */}
          {sites.map((site) => (
            <Section key={site.monitorId} style={styles.siteCard}>
              {/* Site header */}
              <Row>
                <Column>
                  <Text style={styles.siteName}>{site.site.name}</Text>
                  <Text style={styles.siteUrl}>{site.site.url}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ ...styles.trendBadge, color: trendColor(site.trend) }}>
                    {trendArrow(site.trend)}{" "}
                    {site.trend.charAt(0).toUpperCase() + site.trend.slice(1)}
                  </Text>
                  <Text style={styles.strategyLabel}>{site.strategy}</Text>
                </Column>
              </Row>

              {/* Lighthouse scores — all four categories */}
              <Row style={styles.scoresRow}>
                {(
                  [
                    ["Performance",     site.thisWeek.avgPerformanceScore,    site.lastWeek.avgPerformanceScore],
                    ["Accessibility",   site.thisWeek.avgAccessibilityScore,  site.lastWeek.avgAccessibilityScore],
                    ["SEO",             site.thisWeek.avgSeoScore,            site.lastWeek.avgSeoScore],
                    ["Best Practices",  site.thisWeek.avgBestPracticesScore,  site.lastWeek.avgBestPracticesScore],
                  ] as [string, number | null, number | null][]
                ).map(([label, current, previous]) => (
                  <Column key={label} style={styles.scoreCell}>
                    <Text style={styles.scoreLabel}>{label}</Text>
                    <Text style={{ ...styles.scoreValue, color: scoreColor(current) }}>
                      {fmtScore(current)}
                    </Text>
                    <Text style={styles.scorePrev}>
                      {current !== null && previous !== null
                        ? `was ${fmtScore(previous)}`
                        : "\u00A0"}
                    </Text>
                  </Column>
                ))}
              </Row>

              {/* Core Web Vitals */}
              <Row style={styles.metricsRow}>
                <Column style={styles.metricsCell}>
                  <Text style={styles.metricLabel}>LCP</Text>
                  <Text style={styles.metricValue}>
                    {fmtLcp(site.thisWeek.avgLcp)}
                  </Text>
                </Column>
                <Column style={styles.metricsCell}>
                  <Text style={styles.metricLabel}>CLS</Text>
                  <Text style={styles.metricValue}>
                    {fmtCls(site.thisWeek.avgCls)}
                  </Text>
                </Column>
                <Column style={styles.metricsCell}>
                  <Text style={styles.metricLabel}>INP</Text>
                  <Text style={styles.metricValue}>
                    {fmtInp(site.thisWeek.avgInp)}
                  </Text>
                </Column>
              </Row>

              {/* Alert counts */}
              {(site.openAlerts.critical > 0 ||
                site.openAlerts.moderate > 0 ||
                site.openAlerts.minor > 0) && (
                <Row style={{ marginBottom: "8px" }}>
                  <Column>
                    <Text style={styles.alertsLine}>
                      {site.openAlerts.critical > 0 && (
                        <span>
                          <span style={{ color: RED }}>●</span>{" "}
                          {site.openAlerts.critical} critical{"  "}
                        </span>
                      )}
                      {site.openAlerts.moderate > 0 && (
                        <span>
                          <span style={{ color: YELLOW }}>●</span>{" "}
                          {site.openAlerts.moderate} moderate{"  "}
                        </span>
                      )}
                      {site.openAlerts.minor > 0 && (
                        <span>
                          <span style={{ color: MUTED }}>●</span>{" "}
                          {site.openAlerts.minor} minor
                        </span>
                      )}
                    </Text>
                  </Column>
                </Row>
              )}

              {/* Top regressions */}
              {site.topRegressions.length > 0 && (
                <>
                  <Text style={styles.regressionTitle}>Top regressions</Text>
                  {site.topRegressions.map((reg, i) => (
                    <Row key={i} style={styles.regressionRow}>
                      <Column style={{ width: "10px" }}>
                        <Text style={{ ...styles.regressionDot, color: severityDot(reg.severity) }}>
                          ●
                        </Text>
                      </Column>
                      <Column>
                        <Text style={styles.regressionText}>
                          {reg.metricName.toUpperCase()} degraded{" "}
                          {Math.abs(Math.round(reg.percentChange))}%{" "}
                          <span style={{ color: severityDot(reg.severity) }}>
                            ({reg.severity})
                          </span>
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </>
              )}

              {/* CTA */}
              <Button
                href={`${appUrl}/sites/${site.site.id}`}
                style={styles.ctaButton}
              >
                View Site →
              </Button>
            </Section>
          ))}

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <Link href={`${appUrl}/settings`} style={styles.footerLink}>
                Manage notification preferences
              </Link>
              {"  ·  "}
              <Link href={unsubscribeUrl} style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={styles.footerMuted}>
              PerfLabs — Web Performance Monitoring
              <br />
              You&apos;re receiving this because you have an active account with
              monitored sites.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: "#0b1120",
    fontFamily: "'Inter', -apple-system, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: NAVY,
    borderRadius: "12px",
    maxWidth: "600px",
    margin: "0 auto",
    overflow: "hidden" as const,
    border: `1px solid ${BORDER}`,
  },
  header: {
    backgroundColor: "#080e1c",
    padding: "32px 32px 24px",
    textAlign: "center" as const,
    borderBottom: `1px solid ${BORDER}`,
  },
  logo: {
    color: ORANGE,
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    margin: "0 0 4px",
  },
  headerSub: {
    color: TEXT,
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 4px",
  },
  weekLabel: {
    color: MUTED,
    fontSize: "13px",
    margin: 0,
  },
  summarySection: {
    padding: "20px 32px",
    backgroundColor: "#111827",
  },
  summaryCell: {
    textAlign: "center" as const,
    padding: "0 8px",
  },
  summaryNum: {
    color: TEXT,
    fontSize: "28px",
    fontWeight: "700",
    margin: "0 0 2px",
  },
  summaryLabel: {
    color: MUTED,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: 0,
  },
  divider: {
    borderColor: BORDER,
    margin: 0,
  },
  siteCard: {
    padding: "24px 32px",
    borderBottom: `1px solid ${BORDER}`,
  },
  siteName: {
    color: TEXT,
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 2px",
  },
  siteUrl: {
    color: MUTED,
    fontSize: "12px",
    margin: 0,
  },
  trendBadge: {
    fontSize: "13px",
    fontWeight: "600",
    margin: "0 0 2px",
  },
  strategyLabel: {
    color: MUTED,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: 0,
  },
  // Lighthouse scores row
  scoresRow: {
    margin: "14px 0 0",
    backgroundColor: SCORE_BG,
    borderRadius: "8px 8px 0 0",
    padding: "14px 12px 10px",
    borderBottom: `1px solid ${BORDER}`,
  },
  scoreCell: {
    textAlign: "center" as const,
    padding: "0 6px",
  },
  scoreLabel: {
    color: MUTED,
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    margin: "0 0 4px",
  },
  scoreValue: {
    fontSize: "26px",
    fontWeight: "700",
    margin: "0 0 2px",
    letterSpacing: "-0.5px",
  },
  scorePrev: {
    color: MUTED,
    fontSize: "10px",
    margin: 0,
  },
  // Core Web Vitals row (visually connected below scores)
  metricsRow: {
    backgroundColor: CARD_BG,
    borderRadius: "0 0 8px 8px",
    padding: "10px 12px 12px",
    marginBottom: "8px",
  },
  metricsCell: {
    textAlign: "center" as const,
    padding: "0 8px",
  },
  metricLabel: {
    color: MUTED,
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    margin: "0 0 2px",
  },
  metricValue: {
    color: TEXT,
    fontSize: "15px",
    fontWeight: "600",
    margin: 0,
  },
  alertsLine: {
    color: TEXT_DIM,
    fontSize: "13px",
    margin: "4px 0",
  },
  regressionTitle: {
    color: MUTED,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "8px 0 4px",
  },
  regressionRow: {
    marginBottom: "2px",
  },
  regressionDot: {
    fontSize: "8px",
    margin: "0 6px 0 0",
    verticalAlign: "middle",
  },
  regressionText: {
    color: TEXT_DIM,
    fontSize: "13px",
    margin: 0,
  },
  ctaButton: {
    backgroundColor: ORANGE,
    color: "#fff",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px 16px",
    marginTop: "14px",
    display: "inline-block",
    textDecoration: "none",
    "&:hover": { backgroundColor: ORANGE_DARK },
  },
  footer: {
    padding: "20px 32px",
    textAlign: "center" as const,
  },
  footerText: {
    color: MUTED,
    fontSize: "13px",
    margin: "0 0 8px",
  },
  footerLink: {
    color: ORANGE,
    textDecoration: "none",
  },
  footerMuted: {
    color: "#475569",
    fontSize: "11px",
    margin: 0,
    lineHeight: "1.6",
  },
} as const;

export default WeeklyDigestEmail;
