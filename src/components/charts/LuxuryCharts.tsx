"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend, } from "recharts";
const COLORS = {
    gold: "#C9A84C",
    goldLight: "#D4B76A",
    goldDark: "#A88A3E",
    green: "#10B981",
    red: "#EF4444",
    blue: "#3B82F6",
    purple: "#8B5CF6",
    orange: "#F59E0B",
    teal: "#14B8A6",
    pink: "#EC4899",
};
const PIE_COLORS = [COLORS.gold, COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange, COLORS.teal, COLORS.pink, COLORS.red];
interface TooltipPayload {
    name: string;
    value: number;
    color?: string;
}
const CustomTooltip = ({ active, payload, label, formatter }: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
    formatter?: (val: number) => string;
}) => {
    if (active && payload && payload.length) {
        return (<div className="bg-white border border-border-subtle rounded-xl p-3 shadow-elevated">
        <p className="text-text-primary font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: TooltipPayload, i: number) => (<p key={i} className="text-text-muted text-xs">
            {entry.name}:{" "}
            <span className="font-mono font-bold text-text-primary" style={{ color: entry.color || COLORS.gold }}>
              {formatter ? formatter(entry.value) : entry.value.toLocaleString("he-IL")}
            </span>
          </p>))}
      </div>);
    }
    return null;
};
const GRID = "#E8E4DC";
const TICK = { fill: "#6B7280", fontSize: 11 };
const AXIS = { stroke: "#E8E4DC" };
interface MonthlyData {
    month: string;
    revenue: number;
    deals?: number;
}
export function RevenueBarChart({ data }: {
    data: MonthlyData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={24}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
        <XAxis dataKey="month" tick={TICK} axisLine={AXIS}/>
        <YAxis tick={TICK} axisLine={AXIS} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}/>
        <Tooltip content={<CustomTooltip formatter={(val) => `₪${val.toLocaleString("he-IL")}`}/>}/>
        <Bar dataKey="revenue" name="\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA" fill={COLORS.gold} radius={[6, 6, 0, 0]}/>
      </BarChart>
    </ResponsiveContainer>);
}
export function DealsAreaChart({ data }: {
    data: MonthlyData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
        <XAxis dataKey="month" tick={TICK} axisLine={AXIS}/>
        <YAxis tick={TICK} axisLine={AXIS}/>
        <Tooltip content={<CustomTooltip />}/>
        <Area type="monotone" dataKey="deals" name="\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA" stroke={COLORS.gold} strokeWidth={2} fill="url(#goldGradient)"/>
      </AreaChart>
    </ResponsiveContainer>);
}
interface CategoryData {
    name: string;
    value: number;
}
export function CategoryPieChart({ data }: {
    data: CategoryData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "#999" }}>
          {data.map((_entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent"/>))}
        </Pie>
        <Tooltip content={<CustomTooltip formatter={(val) => `₪${val.toLocaleString("he-IL")}`}/>}/>
      </PieChart>
    </ResponsiveContainer>);
}
interface ComboData {
    month: string;
    deals: number;
    revenue: number;
}
export function ComboLineChart({ data }: {
    data: ComboData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
        <XAxis dataKey="month" tick={TICK} axisLine={AXIS}/>
        <YAxis yAxisId="left" tick={TICK} axisLine={AXIS}/>
        <YAxis yAxisId="right" orientation="left" tick={TICK} axisLine={AXIS} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}/>
        <Tooltip content={<CustomTooltip />}/>
        <Legend wrapperStyle={{ color: "#6B7280", fontSize: 12, paddingTop: 8 }}/>
        <Line yAxisId="left" type="monotone" dataKey="deals" name="\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA" stroke={COLORS.gold} strokeWidth={2} dot={{ fill: COLORS.gold, r: 4 }}/>
        <Line yAxisId="right" type="monotone" dataKey="revenue" name="\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA" stroke={COLORS.green} strokeWidth={2} dot={{ fill: COLORS.green, r: 4 }}/>
      </LineChart>
    </ResponsiveContainer>);
}
interface PostsData {
    month: string;
    published: number;
    pending: number;
    rejected: number;
}
export function PostsStackedChart({ data }: {
    data: PostsData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
        <XAxis dataKey="month" tick={TICK} axisLine={AXIS}/>
        <YAxis tick={TICK} axisLine={AXIS}/>
        <Tooltip content={<CustomTooltip />}/>
        <Legend wrapperStyle={{ color: "#6B7280", fontSize: 12, paddingTop: 8 }}/>
        <Bar dataKey="published" name="\u05E4\u05D5\u05E8\u05E1\u05DE\u05D5" stackId="a" fill={COLORS.green}/>
        <Bar dataKey="pending" name="\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD" stackId="a" fill={COLORS.gold}/>
        <Bar dataKey="rejected" name="\u05E0\u05D3\u05D7\u05D5" stackId="a" fill={COLORS.red} radius={[4, 4, 0, 0]}/>
      </BarChart>
    </ResponsiveContainer>);
}
interface PaymentData {
    month: string;
    paid: number;
    overdue: number;
    pending: number;
}
export function PaymentsChart({ data }: {
    data: PaymentData[];
}) {
    return (<ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
        <XAxis dataKey="month" tick={TICK} axisLine={AXIS}/>
        <YAxis tick={TICK} axisLine={AXIS} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}/>
        <Tooltip content={<CustomTooltip formatter={(val) => `₪${val.toLocaleString("he-IL")}`}/>}/>
        <Legend wrapperStyle={{ color: "#6B7280", fontSize: 12, paddingTop: 8 }}/>
        <Area type="monotone" dataKey="paid" name="\u05E9\u05D5\u05DC\u05DD" stroke={COLORS.green} fill="url(#paidGradient)" strokeWidth={2}/>
        <Area type="monotone" dataKey="overdue" name="\u05D1\u05D0\u05D9\u05D7\u05D5\u05E8" stroke={COLORS.red} fill="url(#overdueGradient)" strokeWidth={2}/>
      </AreaChart>
    </ResponsiveContainer>);
}
interface RatingDistData {
    rating: string;
    count: number;
}
export function RatingDistributionChart({ data }: {
    data: RatingDistData[];
}) {
    return (<ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={36} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false}/>
        <XAxis type="number" tick={TICK} axisLine={AXIS}/>
        <YAxis type="category" dataKey="rating" tick={{ fill: "#C9A84C", fontSize: 13 }} axisLine={AXIS} width={60}/>
        <Tooltip content={<CustomTooltip />}/>
        <Bar dataKey="count" name="\u05D3\u05D9\u05E8\u05D5\u05D2\u05D9\u05DD" radius={[0, 6, 6, 0]}>
          {data.map((entry, index) => {
            const num = parseInt(entry.rating);
            let color = COLORS.green;
            if (num <= 2)
                color = COLORS.red;
            else if (num <= 3)
                color = COLORS.orange;
            else if (num <= 4)
                color = COLORS.gold;
            return <Cell key={`cell-${index}`} fill={color}/>;
        })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>);
}
