"use client";
import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ShareIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAltIcon,
  ServerIcon,
  DocumentIcon,
  UsersIcon,
  EyeIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClockIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { CloudIcon } from '@heroicons/react/24/solid';

const AnalyticsDashboard = ({ files = [], stats = {} }) => {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, 1y
  const [analyticsData, setAnalyticsData] = useState({
    storageUsage: {
      used: 2.4,
      total: 10,
      unit: 'GB'
    },
    networkStats: {
      uploadSpeed: 1.2,
      downloadSpeed: 3.4,
      peers: 156,
      uptime: 99.2
    },
    fileStats: {
      totalFiles: 24,
      sharedFiles: 8,
      privateFiles: 16,
      totalDownloads: 142
    },
    monthlyData: [
      { month: 'Jan', uploads: 12, downloads: 45, storage: 1.2 },
      { month: 'Feb', uploads: 19, downloads: 52, storage: 1.8 },
      { month: 'Mar', uploads: 8, downloads: 38, storage: 2.1 },
      { month: 'Apr', uploads: 15, downloads: 67, storage: 2.4 },
      { month: 'May', uploads: 22, downloads: 89, storage: 3.1 },
      { month: 'Jun', uploads: 18, downloads: 76, storage: 2.9 }
    ],
    totalEarnings: '1,234.56 STOR',
    accessLogs: 5847,
    replicationFactor: 3.2,
    networkLatency: '45ms',
    networkActivity: [120, 180, 240, 320, 280, 380, 420, 360, 480, 520, 460, 580]
  });

  const [uploadHistory, setUploadHistory] = useState([]);

  const [downloadHistory, setDownloadHistory] = useState([]);

  const [accessLogs, setAccessLogs] = useState([]);

  const [networkParticipation, setNetworkParticipation] = useState({
    storageProvided: '0 GB',
    storageUsed: '0 GB',
    bandwidthShared: '0 GB',
    rewardsEarned: '0 STOR',
    proofSubmissions: 0,
    successRate: '0%',
    reputation: 0,
    stakingAmount: '0 STOR'
  });

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const StatCard = ({ title, value, unit, icon: Icon, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-600',
      green: 'bg-green-50 border-green-200 text-green-600',
      purple: 'bg-purple-50 border-purple-200 text-purple-600',
      orange: 'bg-orange-50 border-orange-200 text-orange-600'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {value}
            {unit && <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>}
          </h3>
          <p className="text-gray-600 text-sm mt-1">{title}</p>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, max, unit, color = 'blue' }) => {
    const percentage = (value / max) * 100;
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-500">
            {value} / {max} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {percentage.toFixed(1)}% used
        </div>
      </div>
    );
  };

  const SimpleChart = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.uploads, d.downloads, d.storage * 10)));
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item.month}</span>
                <div className="flex space-x-4 text-xs text-gray-500">
                  <span>↑ {item.uploads}</span>
                  <span>↓ {item.downloads}</span>
                  <span>📁 {item.storage}GB</span>
                </div>
              </div>
              <div className="flex space-x-1 h-2">
                <div 
                  className="bg-blue-500 rounded-sm"
                  style={{ width: `${(item.uploads / maxValue) * 100}%` }}
                />
                <div 
                  className="bg-green-500 rounded-sm"
                  style={{ width: `${(item.downloads / maxValue) * 100}%` }}
                />
                <div 
                  className="bg-purple-500 rounded-sm"
                  style={{ width: `${(item.storage * 10 / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-gray-600">Uploads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-gray-600">Downloads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded-sm" />
            <span className="text-gray-600">Storage (×10)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your storage usage and network participation</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Files"
          value={analyticsData.fileStats.totalFiles}
          icon={DocumentIcon}
          color="blue"
        />
        <StatCard
          title="Storage Used"
          value={analyticsData.storageUsage.used}
          unit={analyticsData.storageUsage.unit}
          icon={CloudIcon}
          color="green"
        />
        <StatCard
          title="Network Peers"
          value={analyticsData.networkStats.peers}
          icon={GlobeAltIcon}
          color="purple"
        />
        <StatCard
          title="Total Downloads"
          value={analyticsData.fileStats.totalDownloads}
          icon={ShareIcon}
          color="orange"
        />
      </div>

      {/* Storage and Network Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
          <div className="space-y-4">
            <ProgressBar
              label="Total Storage"
              value={analyticsData.storageUsage.used}
              max={analyticsData.storageUsage.total}
              unit="GB"
              color="blue"
            />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analyticsData.fileStats.privateFiles}</div>
                <div className="text-sm text-gray-600">Private Files</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analyticsData.fileStats.sharedFiles}</div>
                <div className="text-sm text-gray-600">Shared Files</div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Upload Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.uploadSpeed} MB/s</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingDownIcon className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">Download Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.downloadSpeed} MB/s</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ServerIcon className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">Uptime</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.uptime}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <UsersIcon className="w-5 h-5 text-orange-600" />
                <span className="text-gray-700">Connected Peers</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.peers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <SimpleChart 
        data={analyticsData.monthlyData}
        title="Monthly Activity Overview"
      />

      {/* Upload/Download History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h3>
          <div className="space-y-3">
            {uploadHistory.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    upload.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{upload.fileName}</div>
                    <div className="text-xs text-gray-500">{upload.size} • {upload.timestamp}</div>
                    <div className="text-xs text-blue-600">{upload.hash}</div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  upload.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {upload.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Download History</h3>
          <div className="space-y-3">
            {downloadHistory.map((download) => (
              <div key={download.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    download.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{download.fileName}</div>
                    <div className="text-xs text-gray-500">{download.size} • {download.timestamp}</div>
                    <div className="text-xs text-purple-600">from {download.peer}</div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  download.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {download.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Access Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Logs</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accessLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.fileName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{log.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Participation */}
       <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Participation</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
             <CurrencyDollarIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
             <div className="text-2xl font-bold text-gray-900">{networkParticipation.rewardsEarned}</div>
             <div className="text-sm text-gray-600">Rewards Earned</div>
           </div>
           <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
             <CloudIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
             <div className="text-2xl font-bold text-gray-900">{networkParticipation.storageProvided}</div>
             <div className="text-sm text-gray-600">Storage Provided</div>
           </div>
           <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
             <ShieldCheckIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
             <div className="text-2xl font-bold text-gray-900">{networkParticipation.reputation}</div>
             <div className="text-sm text-gray-600">Reputation Score</div>
           </div>
           <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
             <CpuChipIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
             <div className="text-2xl font-bold text-gray-900">{networkParticipation.proofSubmissions}</div>
             <div className="text-sm text-gray-600">Proof Submissions</div>
           </div>
         </div>
         <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <span className="text-gray-700">Success Rate</span>
             <span className="font-semibold text-green-600">{networkParticipation.successRate}</span>
           </div>
           <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <span className="text-gray-700">Staking Amount</span>
             <span className="font-semibold text-blue-600">{networkParticipation.stakingAmount}</span>
           </div>
         </div>
       </div>

       {/* Earnings and Network Activity Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Earnings Chart */}
         <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Earnings (STOR)</h3>
           <div className="h-64">
             <svg className="w-full h-full" viewBox="0 0 400 200">
               <defs>
                 <linearGradient id="earningsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                   <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
                 </linearGradient>
               </defs>
               {analyticsData.monthlyData.map((data, index) => {
                 const x = (index * 60) + 40;
                 const height = (data.uploads / 25) * 150;
                 const y = 180 - height;
                 return (
                   <g key={index}>
                     <rect x={x - 15} y={y} width="30" height={height} fill="url(#earningsGradient)" rx="2" />
                     <text x={x} y="195" textAnchor="middle" className="text-xs fill-gray-600">{data.month}</text>
                     <text x={x} y={y - 5} textAnchor="middle" className="text-xs fill-gray-800">{data.uploads}</text>
                   </g>
                 );
               })}
             </svg>
           </div>
         </div>

         {/* Network Activity Chart */}
         <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Activity</h3>
           <div className="h-64">
             <svg className="w-full h-full" viewBox="0 0 400 200">
               <defs>
                 <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                   <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                 </linearGradient>
               </defs>
               {analyticsData.networkActivity.slice(0, 12).map((activity, index) => {
                  const x1 = (index * 30) + 40;
                  const y1 = 180 - (activity / 600) * 150;
                  const x2 = ((index + 1) * 30) + 40;
                  const y2 = index < 11 ? 180 - (analyticsData.networkActivity[index + 1] / 600) * 150 : y1;
                 return (
                   <g key={index}>
                     {index < 11 && (
                       <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#10B981" strokeWidth="2" />
                     )}
                     <circle cx={x1} cy={y1} r="3" fill="#10B981" />
                     {index % 2 === 0 && (
                       <text x={x1} y="195" textAnchor="middle" className="text-xs fill-gray-600">{index + 1}</text>
                     )}
                   </g>
                 );
               })}
             </svg>
           </div>
         </div>
       </div>

       {/* Additional Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
           <div className="flex items-center justify-between">
             <div>
               <h4 className="text-sm font-medium text-gray-500">Total Earnings</h4>
               <p className="text-2xl font-bold text-gray-900">{analyticsData.totalEarnings}</p>
             </div>
             <CurrencyDollarIcon className="w-8 h-8 text-blue-500" />
           </div>

         </div>

         <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
           <div className="flex items-center justify-between">
             <div>
               <h4 className="text-sm font-medium text-gray-500">Access Events</h4>
               <p className="text-2xl font-bold text-gray-900">{analyticsData.accessLogs}</p>
             </div>
             <EyeIcon className="w-8 h-8 text-purple-500" />
           </div>

         </div>

         <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
           <div className="flex items-center justify-between">
             <div>
               <h4 className="text-sm font-medium text-gray-500">Network Latency</h4>
               <p className="text-2xl font-bold text-gray-900">{analyticsData.networkLatency}</p>
             </div>
             <GlobeAltIcon className="w-8 h-8 text-green-500" />
           </div>
           <div className="mt-4">
             <div className="flex items-center text-sm text-green-600">
               <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
               <span>-5.2ms improvement</span>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};

export default AnalyticsDashboard;