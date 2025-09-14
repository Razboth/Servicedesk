'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_VERSION, getFullVersionInfo, VERSION_HISTORY } from '@/lib/version';
import {
  GitBranch,
  GitCommit,
  Calendar,
  Users,
  Code,
  Package,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Star,
  GitPullRequest,
  FileText
} from 'lucide-react';

interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author?: {
    login: string;
    avatar_url: string;
  };
}

interface SystemFeature {
  category: string;
  features: string[];
  icon: any;
}

export default function AboutPage() {
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [recentCommits, setRecentCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch GitHub data
    const fetchGitHubData = async () => {
      try {
        // Fetch contributors
        const contribResponse = await fetch('https://api.github.com/repos/Razboth/Servicedesk/contributors');
        if (contribResponse.ok) {
          const contribData = await contribResponse.json();
          setContributors(contribData.slice(0, 10)); // Top 10 contributors
        }

        // Fetch recent commits
        const commitsResponse = await fetch('https://api.github.com/repos/Razboth/Servicedesk/commits?per_page=20');
        if (commitsResponse.ok) {
          const commitsData = await commitsResponse.json();
          setRecentCommits(commitsData);
        }
      } catch (error) {
        console.error('Error fetching GitHub data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubData();
  }, []);

  const systemFeatures: SystemFeature[] = [
    {
      category: 'Core Service Management',
      icon: Activity,
      features: [
        'ITIL v4-compliant ticketing system',
        'Multi-level approval workflows',
        'SLA tracking and monitoring',
        'Priority-based ticket routing',
        'Task templates and automation',
        'Custom field templates'
      ]
    },
    {
      category: 'Communication & Notifications',
      icon: CheckCircle2,
      features: [
        'Email notifications (Nodemailer)',
        'Real-time updates (Socket.io)',
        'Support group notifications',
        'Technician interaction alerts',
        'Approval status updates',
        'SLA breach warnings'
      ]
    },
    {
      category: 'Asset Management',
      icon: Package,
      features: [
        'PC Asset Management',
        'License tracking',
        'OS and Office type management',
        'Vendor management',
        'ATM monitoring system',
        'Network infrastructure tracking'
      ]
    },
    {
      category: 'Reporting & Analytics',
      icon: FileText,
      features: [
        'Comprehensive report system',
        'Service-based analytics',
        'Performance dashboards',
        'Export to PDF/Excel',
        'Real-time metrics',
        'Compliance reports'
      ]
    },
    {
      category: 'Security & Access Control',
      icon: AlertCircle,
      features: [
        'Role-based access control (RBAC)',
        'API key management',
        'Account lockout protection',
        'Audit logging',
        'Session management',
        'Security headers'
      ]
    },
    {
      category: 'Integration & Migration',
      icon: GitPullRequest,
      features: [
        'ManageEngine ServiceDesk integration',
        'CSV bulk import/export',
        'API endpoints',
        'Webhook support',
        'Database migration tools',
        'Rollback capability'
      ]
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCommitTypeIcon = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.startsWith('feat:') || msg.startsWith('feature:')) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (msg.startsWith('fix:') || msg.startsWith('bugfix:')) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    if (msg.startsWith('docs:')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (msg.startsWith('refactor:')) return <Code className="w-4 h-4 text-purple-500" />;
    if (msg.startsWith('chore:')) return <Package className="w-4 h-4 text-gray-500" />;
    return <GitCommit className="w-4 h-4 text-gray-400" />;
  };

  const getCommitTypeBadge = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.startsWith('feat:') || msg.startsWith('feature:')) return <Badge className="bg-green-100 text-green-700">Feature</Badge>;
    if (msg.startsWith('fix:') || msg.startsWith('bugfix:')) return <Badge className="bg-yellow-100 text-yellow-700">Fix</Badge>;
    if (msg.startsWith('docs:')) return <Badge className="bg-blue-100 text-blue-700">Docs</Badge>;
    if (msg.startsWith('refactor:')) return <Badge className="bg-purple-100 text-purple-700">Refactor</Badge>;
    if (msg.startsWith('chore:')) return <Badge className="bg-gray-100 text-gray-700">Chore</Badge>;
    return <Badge variant="outline">Commit</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Code className="w-8 h-8 text-white" />
          </div>
          About Bank SulutGo ServiceDesk
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          ITIL v4-compliant service management system for multi-branch banking operations
        </p>
      </div>

      {/* Version Info Card */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Current Version</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">v{APP_VERSION.version}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Semantic Versioning</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GitCommit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Build Info</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Commit: <span className="font-mono">{APP_VERSION.commit}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Build #{APP_VERSION.buildNumber} • {APP_VERSION.buildDate}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Branch: <span className="font-mono">{APP_VERSION.branch}</span>
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Last Update</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {APP_VERSION.lastCommit.message.substring(0, 50)}
              {APP_VERSION.lastCommit.message.length > 50 ? '...' : ''}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {formatDate(APP_VERSION.lastCommit.date)}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="commits">Recent Changes</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="tech">Tech Stack</TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {systemFeatures.map((category) => (
              <Card key={category.category} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <category.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg">{category.category}</h3>
                </div>
                <ul className="space-y-2">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recent Changes Tab */}
        <TabsContent value="commits" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading commits...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCommits.map((commit) => (
                <Card key={commit.sha} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {commit.author && (
                      <img
                        src={commit.author.avatar_url}
                        alt={commit.author.login}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getCommitTypeIcon(commit.commit.message)}
                        <span className="font-mono text-xs text-gray-500">
                          {commit.sha.substring(0, 7)}
                        </span>
                        {getCommitTypeBadge(commit.commit.message)}
                        <span className="text-xs text-gray-500">
                          {formatDate(commit.commit.author.date)}
                        </span>
                      </div>
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {commit.commit.message.split('\n')[0]}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">
                        by {commit.commit.author.name}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contributors Tab */}
        <TabsContent value="contributors" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 animate-pulse mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading contributors...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {contributors.map((contributor) => (
                <a
                  key={contributor.login}
                  href={contributor.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Card className="p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="w-20 h-20 rounded-full mx-auto mb-3 group-hover:ring-4 ring-blue-200 dark:ring-blue-800 transition-all"
                    />
                    <p className="font-medium text-sm truncate">{contributor.login}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-gray-500">{contributor.contributions} commits</span>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tech Stack Tab */}
        <TabsContent value="tech" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                Frontend Stack
              </h3>
              <div className="space-y-2">
                {['Next.js 15 (App Router)', 'React 18', 'TypeScript', 'Tailwind CSS', 'Radix UI', 'React Hook Form', 'Zod Validation', 'React Query', 'Zustand'].map((tech) => (
                  <div key={tech} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tech}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Backend Stack
              </h3>
              <div className="space-y-2">
                {['Next.js API Routes', 'PostgreSQL', 'Prisma ORM', 'NextAuth.js v5', 'Nodemailer', 'Socket.io', 'PM2', 'Node.js 20+'].map((tech) => (
                  <div key={tech} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tech}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Reporting & Visualization
              </h3>
              <div className="space-y-2">
                {['Chart.js', 'Recharts', 'jsPDF', 'XLSX Export', 'React PDF', 'Data Tables'].map((tech) => (
                  <div key={tech} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tech}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-orange-600" />
                Development Tools
              </h3>
              <div className="space-y-2">
                {['Git Version Control', 'GitHub Repository', 'ESLint', 'Prettier', 'TypeScript Compiler', 'Prisma Studio', 'PM2 Process Manager'].map((tech) => (
                  <div key={tech} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tech}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">{APP_VERSION.copyright}</p>
          <p>Built with 💙 for enhanced service management</p>
        </div>
      </div>
    </div>
  );
}