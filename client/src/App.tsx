import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import AdminPosts from "@/pages/AdminPosts";
import AdminMedia from "@/pages/AdminMedia";
import AdminSettings from "@/pages/AdminSettings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Admin routes only - public routes are served by Hugo */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isAuthenticated ? (
          <Admin />
        ) : (
          <AdminLogin />
        )}
      </Route>
      <Route path="/admin/posts">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isAuthenticated ? (
          <AdminPosts />
        ) : (
          <AdminLogin />
        )}
      </Route>
      <Route path="/admin/media">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isAuthenticated ? (
          <AdminMedia />
        ) : (
          <AdminLogin />
        )}
      </Route>
      <Route path="/admin/settings">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isAuthenticated ? (
          <AdminSettings />
        ) : (
          <AdminLogin />
        )}
      </Route>
      <Route path="/admin/new-post">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isAuthenticated ? (
          <Admin />
        ) : (
          <AdminLogin />
        )}
      </Route>
      {/* Fallback for any unmatched admin routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
