import React, { useState, useEffect } from 'react';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import aiStudyCoachAPI from '../services/api';
import Chart from 'react-apexcharts';

const GlobalStatsPage = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [error, setError] = useState(null);
  const [activeTopicTab, setActiveTopicTab] = useState('weak'); // 'strong', 'moderate', 'weak'
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await aiStudyCoachAPI.getGlobalStats(timeRange);
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex items-center justify-center">
        <BackgroundEffects />
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex items-center justify-center">
        <BackgroundEffects />
        <div className="text-center max-w-md mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Statistics</h2>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex items-center justify-center">
        <BackgroundEffects />
        <div className="text-center max-w-md mx-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            No statistics available. Complete some quizzes to see your progress!
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  // Compact Chart options
  const overallChartOptions = {
    chart: {
      type: 'bar',
      height: 240,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        columnWidth: '50%',
        borderRadius: 6,
        distributed: true,
      },
    },
    colors: ['#F59E0B', '#10B981', '#3B82F6'],
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '11px',
        fontWeight: 600,
      },
    },
    legend: { show: false },
    xaxis: {
      categories: ['Quizzes', 'Questions', 'Accuracy %'],
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    grid: {
      strokeDashArray: 4,
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
    tooltip: {
      y: {
        formatter: function (val, { dataPointIndex }) {
          return dataPointIndex === 2 ? val + '%' : val;
        },
      },
    },
  };

  const overallChartData = [
    {
      name: 'Value',
      data: [
        stats.totalQuizzes || 0,
        stats.totalQuestions || 0,
        Math.round(stats.overallAccuracy) || 0,
      ],
    },
  ];

  const typeAccuracyOptions = {
    chart: {
      type: 'bar',
      height: 240,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        columnWidth: '55%',
        borderRadius: 6,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return Math.round(val) + '%';
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
      },
    },
    legend: { show: false },
    xaxis: {
      categories: ['MCQ', 'T/F', 'Fill', 'Short'],
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: function (val) {
          return Math.round(val) + '%';
        },
        style: {
          fontSize: '11px',
        },
      },
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
    grid: {
      strokeDashArray: 4,
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
  };

  const accuracyByTypeData = [
    stats.questionTypesBreakdown.MCQ?.accuracy || 0,
    stats.questionTypesBreakdown.TrueFalse?.accuracy || 0,
    stats.questionTypesBreakdown.FillUp?.accuracy || 0,
    stats.questionTypesBreakdown.Subjective?.accuracy || 0,
  ];

  const typeAccuracyData = [
    {
      name: 'Accuracy',
      data: accuracyByTypeData,
    },
  ];

  const typeChartData = [
    stats.questionTypesBreakdown.MCQ?.count || 0,
    stats.questionTypesBreakdown.TrueFalse?.count || 0,
    stats.questionTypesBreakdown.FillUp?.count || 0,
    stats.questionTypesBreakdown.Subjective?.count || 0,
  ];

  const typeChartOptions = {
    chart: {
      type: 'donut',
      height: 240,
    },
    labels: ['MCQ', 'True/False', 'Fill Blank', 'Short Answer'],
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
    legend: {
      position: 'bottom',
      fontSize: '11px',
      markers: {
        width: 8,
        height: 8,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '11px',
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 600,
            },
          },
        },
      },
    },
  };

  const topicTabs = [
    {
      id: 'weak',
      label: 'To Improve',
      data: stats.topicPerformance.weak,
      color: 'red',
      icon: '⚠️',
    },
    {
      id: 'moderate',
      label: 'Moderate',
      data: stats.topicPerformance.moderate,
      color: 'amber',
      icon: '📊',
    },
    {
      id: 'strong',
      label: 'Strong',
      data: stats.topicPerformance.strong,
      color: 'green',
      icon: '✓',
    },
  ];

  const activeTab = topicTabs.find((tab) => tab.id === activeTopicTab);

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen pb-6">
      <BackgroundEffects />
      <GlobalHeader currentPage="stats" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pt-28">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Learning Analytics</h1>
            <p className="text-slate-600 text-sm">Track your progress</p>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-lg p-0.5 border border-slate-200 self-start sm:self-auto">
            {[
              { value: 'all', label: 'All Time' },
              { value: '30d', label: '30 Days' },
              { value: '7d', label: '7 Days' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  timeRange === option.value
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs mb-1">Quizzes</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalQuizzes}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs mb-1">Questions</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalQuestions}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs mb-1">Accuracy</p>
                <p className="text-2xl font-bold text-slate-800">
                  {Math.round(stats.overallAccuracy)}%
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs mb-1">Streak</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats.activeStreak} <span className="text-sm text-slate-500">days</span>
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Charts Button */}
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="mb-3 text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          {showCharts ? '▼' : '▶'} {showCharts ? 'Hide' : 'Show'} Charts
        </button>

        {/* Compact Charts Section */}
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Accuracy by Type */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Accuracy by Type</h3>
              <Chart
                options={typeAccuracyOptions}
                series={typeAccuracyData}
                type="bar"
                height={240}
              />
            </div>

            {/* Question Types Distribution */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Question Distribution</h3>
              <Chart options={typeChartOptions} series={typeChartData} type="donut" height={240} />
            </div>
          </div>
        )}

        {/* Topic Performance with Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Topic Performance</h3>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-200">
            {topicTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTopicTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTopicTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-700`
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label} ({tab.data.length})
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
            {activeTab.data.length > 0 ? (
              activeTab.data.map((topic, index) => (
                <div
                  key={index}
                  className={`p-3 bg-${activeTab.color}-50 rounded-lg border border-${activeTab.color}-200 hover:shadow-sm transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-medium text-${activeTab.color}-800 text-sm flex-1 mr-2`}>
                      {topic.name}
                    </span>
                    <span
                      className={`text-sm font-bold text-${activeTab.color}-600 whitespace-nowrap`}
                    >
                      {Math.round(topic.accuracy)}%
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-600">
                    <span>{topic.attempts} attempts</span>
                    {topic.trend && (
                      <>
                        <span className="mx-2">•</span>
                        <span
                          className={`capitalize ${
                            topic.trend === 'improving'
                              ? 'text-green-600'
                              : topic.trend === 'declining'
                                ? 'text-red-600'
                                : 'text-slate-500'
                          }`}
                        >
                          {topic.trend === 'improving'
                            ? '↗'
                            : topic.trend === 'declining'
                              ? '↘'
                              : '→'}{' '}
                          {topic.trend}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-slate-500 text-sm">
                {activeTopicTab === 'weak' && '🎉 Great! No weak topics'}
                {activeTopicTab === 'moderate' && 'No moderate topics yet'}
                {activeTopicTab === 'strong' && 'Complete more quizzes to see strong topics'}
              </div>
            )}
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2 bg-white border-2 border-amber-600 text-amber-600 text-sm font-semibold rounded-lg hover:bg-amber-50 transition-all duration-200"
          >
            ← Back to Home
          </button>
          {stats.topicPerformance.weak.length > 0 && (
            <button
              onClick={() => onNavigate('home', { openQuizSetup: true })}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
            >
              Practice Weak Topics →
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default GlobalStatsPage;
