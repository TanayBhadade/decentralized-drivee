import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  CloudIcon,
  DocumentIcon,
  ShareIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CalendarIcon,
  FolderIcon,
  CpuChipIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import FilePreview from './FilePreview';

const Dashboard = ({ files = [] }) => {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [selectedMetric, setSelectedMetric] = useState('uploads');
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handle file preview
  const handlePreviewFile = (file) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleDownloadFile = (file) => {
    // In a real app, this would trigger the download with integrity check
    console.log('Downloading file:', file?.name);
    // You could integrate with downloadWithIntegrityCheck here
  };

  // Calculate storage metrics
  const storageMetrics = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const avgFileSize = files.length > 0 ? totalSize / files.length : 0;
    const largestFile = files.reduce((max, file) => 
      (file.size || 0) > (max.size || 0) ? file : max, files[0] || {});
    
    return {
      totalSize,
      avgFileSize,
      largestFile,
      totalFiles: files.length,
      formattedSize: formatBytes(totalSize),
      formattedAvgSize: formatBytes(avgFileSize)
    };
  }, [files]);

  // Calculate file type distribution
  const fileTypeStats = useMemo(() => {
    const types = {};
    files.forEach(file => {
      const ext = file.name?.split('.').pop()?.toLowerCase() || 'unknown';
      types[ext] = (types[ext] || 0) + 1;
    });
    return Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count, percentage: (count / files.length * 100).toFixed(1) }));
  }, [files]);

  // Calculate activity metrics
  const activityMetrics = useMemo(() => {
    const now = new Date();
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    
    const cutoff = now.getTime() - ranges[timeRange];
    const recentFiles = files.filter(file => 
      new Date(file.uploadTime || file.timestamp || 0).getTime() > cutoff
    );
    
    const sharedFiles = files.filter(file => file.isShared || file.sharedWith?.length > 0);
    const encryptedFiles = files.filter(file => file.isEncrypted);
    
    return {
      recentUploads: recentFiles.length,
      sharedFiles: sharedFiles.length,
      encryptedFiles: encryptedFiles.length,
      publicFiles: files.filter(file => file.isPublic).length,
      recentSize: recentFiles.reduce((sum, file) => sum + (file.size || 0), 0)
    };
  }, [files, timeRange]);

  // Format bytes to human readable
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Get file type icon
  const getFileTypeIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    const iconClass = "w-4 h-4";
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
      return <EyeIcon className={iconClass} />;
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return <DocumentIcon className={iconClass} />;
    } else {
      return <FolderIcon className={iconClass} />;
    }
  };

  // Calculate trend (mock calculation for demo)
  const getTrend = (current, previous = 0) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous * 100);
    return { value: Math.abs(change).toFixed(1), isPositive: change >= 0 };
  };

  const uploadTrend = getTrend(activityMetrics.recentUploads, Math.floor(activityMetrics.recentUploads * 0.8));
  const storageTrend = getTrend(storageMetrics.totalSize, Math.floor(storageMetrics.totalSize * 0.9));

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-light-silver">Dashboard</h1>
          <p className="text-light-silver/60 mt-1">Overview of your decentralized storage</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-space-indigo border border-electric-cyan/20 rounded-lg text-light-silver focus:outline-none focus:ring-2 focus:ring-electric-cyan"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Files */}
        <div className="bg-gradient-to-br from-electric-cyan/10 to-blue-500/10 border border-electric-cyan/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-silver/60 text-sm font-medium">Total Files</p>
              <p className="text-3xl font-bold text-light-silver mt-1">{storageMetrics.totalFiles}</p>

            </div>
            <DocumentIcon className="w-8 h-8 text-electric-cyan" />
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-silver/60 text-sm font-medium">Storage Used</p>
              <p className="text-3xl font-bold text-light-silver mt-1">{storageMetrics.formattedSize}</p>

            </div>
            <CloudIcon className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        {/* Shared Files */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-silver/60 text-sm font-medium">Shared Files</p>
              <p className="text-3xl font-bold text-light-silver mt-1">{activityMetrics.sharedFiles}</p>
              <p className="text-xs text-light-silver/40 mt-2">
                {((activityMetrics.sharedFiles / storageMetrics.totalFiles) * 100 || 0).toFixed(1)}% of total
              </p>
            </div>
            <ShareIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        {/* Encrypted Files */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-silver/60 text-sm font-medium">Encrypted Files</p>
              <p className="text-3xl font-bold text-light-silver mt-1">{activityMetrics.encryptedFiles}</p>
              <p className="text-xs text-light-silver/40 mt-2">
                {((activityMetrics.encryptedFiles / storageMetrics.totalFiles) * 100 || 0).toFixed(1)}% of total
              </p>
            </div>
            <LockClosedIcon className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Type Distribution */}
        <div className="bg-space-indigo/50 border border-electric-cyan/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-light-silver">File Types</h3>
            <ChartBarIcon className="w-6 h-6 text-electric-cyan" />
          </div>
          <div className="space-y-4">
            {fileTypeStats.map((stat, index) => (
              <div key={stat.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                    index === 0 ? 'from-electric-cyan to-blue-400' :
                    index === 1 ? 'from-purple-400 to-pink-400' :
                    index === 2 ? 'from-green-400 to-emerald-400' :
                    index === 3 ? 'from-orange-400 to-red-400' :
                    'from-gray-400 to-gray-500'
                  }`}></div>
                  <span className="text-light-silver text-sm font-medium">.{stat.type}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-light-silver/60 text-sm">{stat.count} files</span>
                  <span className="text-electric-cyan text-sm font-medium">{stat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Analytics */}
        <div className="bg-space-indigo/50 border border-electric-cyan/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-light-silver">Storage Analytics</h3>
            <CpuChipIcon className="w-6 h-6 text-electric-cyan" />
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-light-silver/60 text-sm">Average File Size</span>
              <span className="text-light-silver font-medium">{storageMetrics.formattedAvgSize}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-light-silver/60 text-sm">Largest File</span>
              <span className="text-light-silver font-medium">
                {formatBytes(storageMetrics.largestFile?.size || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-light-silver/60 text-sm">Recent Uploads ({timeRange})</span>
              <span className="text-electric-cyan font-medium">{activityMetrics.recentUploads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-light-silver/60 text-sm">Recent Storage Added</span>
              <span className="text-light-silver font-medium">{formatBytes(activityMetrics.recentSize)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-space-indigo/50 border border-electric-cyan/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-light-silver">Recent Activity</h3>
          <ClockIcon className="w-6 h-6 text-electric-cyan" />
        </div>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <DocumentIcon className="w-12 h-12 text-light-silver/30 mx-auto mb-3" />
            <p className="text-light-silver/60">No files uploaded yet</p>
            <p className="text-light-silver/40 text-sm mt-1">Start by uploading your first file</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.slice(0, 8).map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-electric-cyan/5 border border-electric-cyan/10 rounded-lg hover:bg-electric-cyan/10 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-electric-cyan/20 rounded-lg">
                    {getFileTypeIcon(file.name)}
                  </div>
                  <div>
                    <p className="text-light-silver font-medium">{file.name}</p>
                    <div className="flex items-center space-x-4 text-xs text-light-silver/60 mt-1">
                      <span>{formatBytes(file.size || 0)}</span>
                      {file.isEncrypted && (
                        <span className="flex items-center space-x-1">
                          <LockClosedIcon className="w-3 h-3" />
                          <span>Encrypted</span>
                        </span>
                      )}
                      {file.isShared && (
                        <span className="flex items-center space-x-1">
                          <ShareIcon className="w-3 h-3" />
                          <span>Shared</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handlePreviewFile(file)}
                    className="p-2 text-electric-cyan hover:text-light-silver hover:bg-electric-cyan/20 rounded-lg transition-colors"
                    title="Preview file"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <div className="text-right">
                    <p className="text-light-silver/60 text-sm">
                      {new Date(file.uploadTime || file.timestamp || Date.now()).toLocaleDateString()}
                    </p>
                    <p className="text-light-silver/40 text-xs">
                      {new Date(file.uploadTime || file.timestamp || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {isPreviewOpen && previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onDownload={handleDownloadFile}
        />
      )}
    </div>
  );
};

export default Dashboard;
