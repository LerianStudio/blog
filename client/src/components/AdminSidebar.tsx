import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  FileText, 
  Edit, 
  Image, 
  Settings, 
  Eye, 
  Rocket, 
  LogOut,
  User
} from "lucide-react";

interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  lastUpdate: string | null;
}

export default function AdminSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user, // Only fetch if user is authenticated
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (path: string) => {
    return location === path || location.startsWith(path);
  };

  const navItems = [
    { href: "/admin", icon: Home, label: "Dashboard", exact: true },
    { href: "/admin/posts", icon: FileText, label: "All Posts", badge: stats?.totalPosts?.toString() },
    { href: "/admin/new-post", icon: Edit, label: "New Post" },
    { href: "/admin/media", icon: Image, label: "Media" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
            H
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Hugo CMS</h3>
            <p className="text-xs text-gray-500">Content Management</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          {(user as any)?.profileImageUrl ? (
            <img 
              src={(user as any).profileImageUrl} 
              alt="User profile" 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {(user as any)?.firstName || (user as any)?.email || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">Admin</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? location === item.href : isActive(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    active 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="ml-auto bg-gray-200 text-gray-700 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Site Actions
          </h3>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-600 hover:text-gray-900"
              onClick={() => window.open("/hugo", "_blank")}
            >
              <Eye className="w-4 h-4 mr-3" />
              Preview Hugo Site
            </Button>
            <Button variant="ghost" className="w-full justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50">
              <Rocket className="w-4 h-4 mr-3" />
              Build Hugo Site
            </Button>
          </div>
        </div>
      </nav>

      {/* Build Status */}
      <div className="p-4 border-t border-gray-200 bg-green-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600 font-medium">Build Successful</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
      </div>
    </aside>
  );
}
