import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Target, Zap, DollarSign, Clock, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ChartData = {
  label: string;
  value: number;
  percentage: number;
  color: string;
};

type TagData = {
  tag: string;
  count: number;
};

export function SurveyDashboardView() {
  const [totalResponses, setTotalResponses] = useState(0);
  const [completedResponses, setCompletedResponses] = useState(0);
  const [userTypeData, setUserTypeData] = useState<ChartData[]>([]);
  const [industryData, setIndustryData] = useState<ChartData[]>([]);
  const [digitalLevelData, setDigitalLevelData] = useState<ChartData[]>([]);
  const [automationData, setAutomationData] = useState<ChartData[]>([]);
  const [budgetData, setBudgetData] = useState<ChartData[]>([]);
  const [urgencyData, setUrgencyData] = useState<ChartData[]>([]);
  const [topTags, setTopTags] = useState<TagData[]>([]);
  const [topInsights, setTopInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const { data: responses, error } = await supabase
      .from('survey_responses')
      .select('*');

    if (error || !responses) {
      setLoading(false);
      return;
    }

    setTotalResponses(responses.length);
    setCompletedResponses(responses.filter((r) => r.completed_at).length);

    processUserTypeData(responses);
    processIndustryData(responses);
    processDigitalLevelData(responses);
    processAutomationData(responses);
    processBudgetData(responses);
    processUrgencyData(responses);
    processTagData(responses);
    processInsightData(responses);

    setLoading(false);
  };

  const processUserTypeData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.user_type) {
        counts[r.user_type] = (counts[r.user_type] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.user_type).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key,
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setUserTypeData(data.sort((a, b) => b.value - a.value));
  };

  const processIndustryData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.industry) {
        counts[r.industry] = (counts[r.industry] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.industry).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key,
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setIndustryData(data.sort((a, b) => b.value - a.value).slice(0, 8));
  };

  const processDigitalLevelData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.digital_level) {
        counts[r.digital_level] = (counts[r.digital_level] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.digital_level).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key,
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setDigitalLevelData(data.sort((a, b) => b.value - a.value));
  };

  const processAutomationData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.wants_automation) {
        counts[r.wants_automation] = (counts[r.wants_automation] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.wants_automation).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key,
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setAutomationData(data.sort((a, b) => b.value - a.value));
  };

  const processBudgetData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.budget) {
        counts[r.budget] = (counts[r.budget] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.budget).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key.replace('_', ' – '),
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setBudgetData(data.sort((a, b) => b.value - a.value));
  };

  const processUrgencyData = (responses: any[]) => {
    const counts: { [key: string]: number } = {};
    responses.forEach((r) => {
      if (r.urgency) {
        counts[r.urgency] = (counts[r.urgency] || 0) + 1;
      }
    });

    const total = responses.filter((r) => r.urgency).length;
    const data = Object.entries(counts).map(([key, value]) => ({
      label: key.replace('_', ' '),
      value,
      percentage: (value / total) * 100,
      color: getColor(key),
    }));

    setUrgencyData(data.sort((a, b) => b.value - a.value));
  };

  const processTagData = (responses: any[]) => {
    const tagCounts: { [key: string]: number } = {};

    responses.forEach((r) => {
      if (r.live_tags && Array.isArray(r.live_tags)) {
        r.live_tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const data = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    setTopTags(data);
  };

  const processInsightData = (responses: any[]) => {
    const insightCounts: { [key: string]: number } = {};

    responses.forEach((r) => {
      if (r.live_insights && Array.isArray(r.live_insights)) {
        r.live_insights.forEach((insight: string) => {
          insightCounts[insight] = (insightCounts[insight] || 0) + 1;
        });
      }
    });

    const data = Object.entries(insightCounts)
      .map(([insight, count]) => insight)
      .slice(0, 10);

    setTopInsights(data);
  };

  const getColor = (key: string): string => {
    const colors: { [key: string]: string } = {
      SME: '#3b82f6',
      startup: '#10b981',
      corporate: '#8b5cf6',
      government: '#f59e0b',
      education: '#ef4444',
      yes: '#10b981',
      no: '#ef4444',
      unsure: '#f59e0b',
    };
    return colors[key] || '#6366f1';
  };

  const DonutChart = ({ data, title }: { data: ChartData[]; title: string }) => {
    const maxValue = Math.max(...data.map((d) => d.value), 1);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {item.label}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.value} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  style={{ backgroundColor: item.color }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Survey Intelligence Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time insights from {totalResponses} responses ({completedResponses} completed)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalResponses}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Responses</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedResponses}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {topTags.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Tags</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Lightbulb className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {topInsights.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Insights</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DonutChart data={userTypeData} title="User Type Distribution" />
          <DonutChart data={industryData} title="Top Industries" />
          <DonutChart data={digitalLevelData} title="Digital Maturity" />
          <DonutChart data={automationData} title="Automation Interest" />
          <DonutChart data={budgetData} title="Budget Distribution" />
          <DonutChart data={urgencyData} title="Urgency Levels" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Pain Tags
              </h3>
            </div>
            <div className="space-y-3">
              {topTags.map((tag, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {tag.tag}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Key Insights
              </h3>
            </div>
            <div className="space-y-3">
              {topInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                >
                  • {insight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
