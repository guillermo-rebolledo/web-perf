"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  MoreVertical,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Data ───────────────────────────────────────────────────────────────────

const revenueData = [
  { month: "Jan", revenue: 3200 },
  { month: "Feb", revenue: 2800 },
  { month: "Mar", revenue: 3100 },
  { month: "Apr", revenue: 2900 },
  { month: "May", revenue: 3500 },
  { month: "Jun", revenue: 3300 },
  { month: "Jul", revenue: 3800 },
];

const moveGoalData = [
  { day: "1", cal: 280 },
  { day: "2", cal: 320 },
  { day: "3", cal: 250 },
  { day: "4", cal: 350 },
  { day: "5", cal: 300 },
  { day: "6", cal: 280 },
  { day: "7", cal: 340 },
  { day: "8", cal: 310 },
  { day: "9", cal: 290 },
  { day: "10", cal: 330 },
  { day: "11", cal: 280 },
  { day: "12", cal: 360 },
  { day: "13", cal: 300 },
  { day: "14", cal: 320 },
];

const exerciseData = [
  { day: "Mon", thisWeek: 30, lastWeek: 40 },
  { day: "Tue", thisWeek: 50, lastWeek: 45 },
  { day: "Wed", thisWeek: 80, lastWeek: 55 },
  { day: "Thu", thisWeek: 60, lastWeek: 50 },
  { day: "Fri", thisWeek: 45, lastWeek: 48 },
  { day: "Sat", thisWeek: 50, lastWeek: 52 },
  { day: "Sun", thisWeek: 55, lastWeek: 50 },
];

const payments = [
  {
    status: "Success",
    email: "ken99@yahoo.com",
    method: "Credit Card",
    amount: "$316.00",
  },
  {
    status: "Success",
    email: "abe45@gmail.com",
    method: "PayPal",
    amount: "$242.00",
  },
  {
    status: "Processing",
    email: "monserrat44@gmail.com",
    method: "Credit Card",
    amount: "$837.00",
  },
  {
    status: "Success",
    email: "silas22@gmail.com",
    method: "Credit Card",
    amount: "$874.00",
  },
  {
    status: "Failed",
    email: "carmella@hotmail.com",
    method: "PayPal",
    amount: "$721.00",
  },
];

const tabs = [
  "Custom",
  "Cards",
  "Dashboard",
  "Mail",
  "Pricing",
  "Color Palette",
];

// ─── Calendar ───────────────────────────────────────────────────────────────

function Calendar() {
  const year = 2025;
  const month = 5; // June (0-indexed)
  const today = 5;
  const selected = 13;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const weeks: (number | null)[][] = [];
  let currentDay = 1;
  let prevDay = daysInPrevMonth - firstDay + 1;
  let nextDay = 1;

  for (let week = 0; week < 6; week++) {
    const row: (number | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (week === 0 && dow < firstDay) {
        row.push(-(prevDay++));
      } else if (currentDay > daysInMonth) {
        row.push(-(100 + nextDay++));
      } else {
        row.push(currentDay++);
      }
    }
    weeks.push(row);
    if (currentDay > daysInMonth && weeks.length >= 5) break;
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="p-1 hover:bg-accent rounded">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium">June 2025</span>
          <button className="p-1 hover:bg-accent rounded">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-muted-foreground py-2 font-medium"
            >
              {d}
            </div>
          ))}
          {weeks.flat().map((day, i) => {
            const isOutside = day !== null && day < 0;
            const dayNum = day === null ? 0 : Math.abs(day > 100 ? day - 100 : day);
            const isToday = !isOutside && day === today;
            const isSelected = !isOutside && day === selected;

            return (
              <div
                key={i}
                className={`
                  relative flex items-center justify-center text-sm py-1.5
                  ${isOutside ? "text-muted-foreground/40" : ""}
                  ${isToday ? "font-semibold" : ""}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-md text-sm
                    ${isToday ? "bg-primary text-primary-foreground" : ""}
                    ${isSelected && !isToday ? "border border-foreground/30" : ""}
                    ${!isToday && !isSelected && !isOutside ? "hover:bg-accent cursor-pointer" : ""}
                  `}
                >
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Move Goal ──────────────────────────────────────────────────────────────

function MoveGoalCard() {
  const [calories, setCalories] = useState(350);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Move Goal</CardTitle>
        <CardDescription>Set your daily activity goal.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setCalories((c) => Math.max(50, c - 10))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <div className="text-center">
            <div className="text-5xl font-bold tracking-tighter">{calories}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              calories/day
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setCalories((c) => c + 10)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="w-full h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moveGoalData} barSize={14}>
              <Bar
                dataKey="cal"
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Set Goal</Button>
      </CardFooter>
    </Card>
  );
}

// ─── Total Revenue ──────────────────────────────────────────────────────────

function TotalRevenueCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardDescription>Total Revenue</CardDescription>
        <CardTitle className="text-4xl font-bold tracking-tighter">
          $15,231.89
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
      </CardContent>
      <CardFooter className="flex-1 items-end pt-0">
        <div className="w-full h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={{ fill: "var(--color-chart-2)", r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardFooter>
    </Card>
  );
}

// ─── Subscription Form ──────────────────────────────────────────────────────

function SubscriptionCard() {
  const [plan, setPlan] = useState<"starter" | "pro">("starter");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upgrade your subscription</CardTitle>
        <CardDescription>
          You are currently on the free plan. Upgrade to the pro plan to get
          access to all features.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Evil Rabbit" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="example@acme.com" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="card">Card Number</Label>
          <div className="grid grid-cols-6 gap-2">
            <Input
              id="card"
              placeholder="1234 1234 1234 1234"
              className="col-span-3"
            />
            <Input placeholder="MM/YY" className="col-span-1.5" />
            <Input placeholder="CVC" className="col-span-1" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Plan</Label>
          <p className="text-sm text-muted-foreground">
            Select the plan that best fits your needs.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPlan("starter")}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                plan === "starter"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div
                className={`mt-0.5 h-3 w-3 rounded-full border-2 flex-shrink-0 ${
                  plan === "starter"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              />
              <div>
                <div className="text-sm font-medium">Starter Plan</div>
                <div className="text-xs text-muted-foreground">
                  Perfect for small businesses.
                </div>
              </div>
            </button>
            <button
              onClick={() => setPlan("pro")}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                plan === "pro"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div
                className={`mt-0.5 h-3 w-3 rounded-full border-2 flex-shrink-0 ${
                  plan === "pro"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              />
              <div>
                <div className="text-sm font-medium">Pro Plan</div>
                <div className="text-xs text-muted-foreground">
                  More features and storage.
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Additional notes..." />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Exercise Minutes ───────────────────────────────────────────────────────

function ExerciseCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Minutes</CardTitle>
        <CardDescription>
          Your exercise minutes are ahead of where you normally are.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exerciseData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--color-foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="lastWeek"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ fill: "var(--color-chart-1)", r: 3, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="thisWeek"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={{ fill: "var(--color-chart-2)", r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Payments Table ─────────────────────────────────────────────────────────

function PaymentsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>Manage your payment methods.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.status}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{p.method}</TableCell>
                <TableCell className="text-right">{p.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CardsPage() {
  const [activeTab, setActiveTab] = useState("Cards");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Tab Navigation */}
      <div className="border-b">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-1 py-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-3 py-1.5 text-sm rounded-md transition-colors
                    ${
                      activeTab === tab
                        ? "bg-secondary text-secondary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
              <button className="p-1.5 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Row 1 */}
          <TotalRevenueCard />
          <Calendar />
          <MoveGoalCard />

          {/* Row 2: Subscription (spans 1 col) + Right column (spans 2 cols) */}
          <div className="lg:row-span-2">
            <SubscriptionCard />
          </div>
          <div className="lg:col-span-2 grid gap-6">
            <ExerciseCard />
            <PaymentsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
