import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Globe, 
  Palette, 
  Shield, 
  Database,
  Rocket,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface SiteSettings {
  title: string;
  description: string;
  baseUrl: string;
  language: string;
  timezone: string;
  postsPerPage: number;
  enableComments: boolean;
  enableSearch: boolean;
  enableRss: boolean;
  metaKeywords: string;
  googleAnalytics: string;
  socialTwitter: string;
  socialGithub: string;
  socialLinkedin: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  const [settings, setSettings] = useState<SiteSettings>({
    title: "TechBlog",
    description: "A modern blog platform built with Hugo and powered by a custom CMS",
    baseUrl: "https://your-domain.com",
    language: "en",
    timezone: "UTC",
    postsPerPage: 10,
    enableComments: false,
    enableSearch: true,
    enableRss: true,
    metaKeywords: "blog, technology, programming, hugo",
    googleAnalytics: "",
    socialTwitter: "",
    socialGithub: "",
    socialLinkedin: ""
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SiteSettings) => {
      return await apiRequest("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const buildSiteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/build", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Site built successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to build site",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "seo", label: "SEO & Analytics", icon: Globe },
    { id: "social", label: "Social Media", icon: Palette },
    { id: "advanced", label: "Advanced", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        
        <main className="flex-1 ml-64">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">
                  Configure your blog settings and preferences
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => buildSiteMutation.mutate()}
                  disabled={buildSiteMutation.isPending}
                  variant="outline"
                  className="text-github-blue border-github-blue hover:bg-github-blue hover:text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {buildSiteMutation.isPending ? "Building..." : "Build Site"}
                </Button>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                  className="bg-github-blue hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6">
                    <nav className="space-y-2">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                              isActive
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                            <span className="font-medium">{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-3">
                {activeTab === "general" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        General Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="title">Site Title</Label>
                          <Input
                            id="title"
                            value={settings.title}
                            onChange={(e) => updateSetting("title", e.target.value)}
                            placeholder="Your Blog Title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="baseUrl">Base URL</Label>
                          <Input
                            id="baseUrl"
                            value={settings.baseUrl}
                            onChange={(e) => updateSetting("baseUrl", e.target.value)}
                            placeholder="https://your-domain.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Site Description</Label>
                        <Textarea
                          id="description"
                          value={settings.description}
                          onChange={(e) => updateSetting("description", e.target.value)}
                          placeholder="A brief description of your blog"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="language">Language</Label>
                          <Input
                            id="language"
                            value={settings.language}
                            onChange={(e) => updateSetting("language", e.target.value)}
                            placeholder="en"
                          />
                        </div>
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Input
                            id="timezone"
                            value={settings.timezone}
                            onChange={(e) => updateSetting("timezone", e.target.value)}
                            placeholder="UTC"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postsPerPage">Posts Per Page</Label>
                          <Input
                            id="postsPerPage"
                            type="number"
                            value={settings.postsPerPage}
                            onChange={(e) => updateSetting("postsPerPage", parseInt(e.target.value))}
                            min="1"
                            max="50"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Features</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="enableComments">Enable Comments</Label>
                              <p className="text-sm text-gray-600">Allow readers to comment on posts</p>
                            </div>
                            <Switch
                              id="enableComments"
                              checked={settings.enableComments}
                              onCheckedChange={(checked) => updateSetting("enableComments", checked)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="enableSearch">Enable Search</Label>
                              <p className="text-sm text-gray-600">Add search functionality to your blog</p>
                            </div>
                            <Switch
                              id="enableSearch"
                              checked={settings.enableSearch}
                              onCheckedChange={(checked) => updateSetting("enableSearch", checked)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="enableRss">Enable RSS Feed</Label>
                              <p className="text-sm text-gray-600">Generate RSS/Atom feeds for subscribers</p>
                            </div>
                            <Switch
                              id="enableRss"
                              checked={settings.enableRss}
                              onCheckedChange={(checked) => updateSetting("enableRss", checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "seo" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Globe className="w-5 h-5 mr-2" />
                        SEO & Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label htmlFor="metaKeywords">Meta Keywords</Label>
                        <Input
                          id="metaKeywords"
                          value={settings.metaKeywords}
                          onChange={(e) => updateSetting("metaKeywords", e.target.value)}
                          placeholder="keyword1, keyword2, keyword3"
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          Comma-separated keywords for search engines
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="googleAnalytics">Google Analytics ID</Label>
                        <Input
                          id="googleAnalytics"
                          value={settings.googleAnalytics}
                          onChange={(e) => updateSetting("googleAnalytics", e.target.value)}
                          placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX"
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          Your Google Analytics tracking ID
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">SEO Optimization Tips</h4>
                            <ul className="text-sm text-blue-700 mt-2 space-y-1">
                              <li>• Use descriptive titles and meta descriptions</li>
                              <li>• Include relevant keywords naturally in your content</li>
                              <li>• Optimize images with alt text</li>
                              <li>• Create clean, readable URLs</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "social" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Social Media
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label htmlFor="socialTwitter">Twitter Username</Label>
                        <Input
                          id="socialTwitter"
                          value={settings.socialTwitter}
                          onChange={(e) => updateSetting("socialTwitter", e.target.value)}
                          placeholder="@yourusername"
                        />
                      </div>

                      <div>
                        <Label htmlFor="socialGithub">GitHub Username</Label>
                        <Input
                          id="socialGithub"
                          value={settings.socialGithub}
                          onChange={(e) => updateSetting("socialGithub", e.target.value)}
                          placeholder="yourusername"
                        />
                      </div>

                      <div>
                        <Label htmlFor="socialLinkedin">LinkedIn Profile</Label>
                        <Input
                          id="socialLinkedin"
                          value={settings.socialLinkedin}
                          onChange={(e) => updateSetting("socialLinkedin", e.target.value)}
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Social Media Integration</h4>
                        <p className="text-sm text-gray-600">
                          These social media links will appear in your blog's footer and author profiles.
                          Make sure to use complete URLs for LinkedIn and usernames for Twitter/GitHub.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "advanced" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Advanced Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-900">Advanced Configuration</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              These settings affect the core functionality of your blog. 
                              Only modify if you understand the implications.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Hugo Configuration</h3>
                        <div className="bg-gray-50 border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium">Rebuild Hugo Configuration</h4>
                              <p className="text-sm text-gray-600">
                                Regenerate hugo.toml with current settings
                              </p>
                            </div>
                            <Button variant="outline">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Rebuild Config
                            </Button>
                          </div>
                        </div>

                        <div className="bg-gray-50 border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium">Clear Cache</h4>
                              <p className="text-sm text-gray-600">
                                Clear all cached files and rebuild site
                              </p>
                            </div>
                            <Button variant="outline">
                              <Database className="w-4 h-4 mr-2" />
                              Clear Cache
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Export & Backup</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Button variant="outline" className="w-full">
                            <Database className="w-4 h-4 mr-2" />
                            Export Content
                          </Button>
                          <Button variant="outline" className="w-full">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Backup Settings
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}