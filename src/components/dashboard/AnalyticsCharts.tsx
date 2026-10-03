"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsChartsProps {
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = ["#ea580c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"];

export function AnalyticsCharts({ monthlyTrend, categoryData }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 2-Column Area Chart: Monthly Inflow vs Outflow */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Revenue & Expense Flow (Monthly Trend)
            </h3>
            <p className="text-xs text-slate-500">
              Visual tracking of money received vs money spent
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-semibold">
            FY 2026-27
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                contentStyle={{
                  borderRadius: "12px",
                  fontSize: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Money Received (₹)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#incomeGrad)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Money Spent (₹)"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#expenseGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 1-Column Donut Chart: Service Revenue Distribution */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Service Distribution
          </h3>
          <p className="text-xs text-slate-500 mb-2">Revenue split by travel vertical</p>
        </div>

        {categoryData.length === 0 ? (
          <div className="h-48 w-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center mb-2 text-slate-300">
              ₹
            </div>
            <p className="text-xs font-semibold text-slate-500">No revenue data yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Record bookings to view category split</p>
          </div>
        ) : (
          <>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              {categoryData.slice(0, 4).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-400 truncate">{c.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{c.value.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
